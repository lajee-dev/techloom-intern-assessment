// lib/reservationService.ts
import mongoose from "mongoose";
import Product from "@/lib/models/Product";
import Order, { OrderStatus } from "@/lib/models/Order";
import { PaymentOutcome, simulatePayment } from "@/lib/mockPayment";
import { assertTransition, RESERVING_STATUSES } from "@/lib/orderStateMachine";

const RESERVATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class InsufficientStockError extends Error {
  constructor(productId: string) {
    super(`Insufficient stock for product ${productId}`);
    this.name = "InsufficientStockError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} not found`);
    this.name = "OrderNotFoundError";
  }
}

/**
 * Atomically reserves `qty` units of a single product.
 * The filter + $inc happen as one atomic DB operation, so two
 * concurrent requests can never both pass the stock check.
 */
async function reserveOne(
  productId: mongoose.Types.ObjectId,
  qty: number,
  session: mongoose.ClientSession
) {
  const updated = await Product.findOneAndUpdate(
    {
      _id: productId,
      $expr: { $gte: [{ $subtract: ["$stock", "$reserved"] }, qty] },
    },
    { $inc: { reserved: qty } },
    { new: true, session }
  );

  if (!updated) {
    throw new InsufficientStockError(productId.toString());
  }

  return updated;
}

/**
 * Atomically releases `qty` units back to available stock
 * (reserved decreases, stock is untouched — stock only ever
 * moves down on payment success, separately).
 */
async function releaseOne(
  productId: mongoose.Types.ObjectId,
  qty: number,
  session: mongoose.ClientSession
) {
  await Product.updateOne(
    { _id: productId },
    { $inc: { reserved: -qty } },
    { session }
  );
}

/**
 * Moves an order from PENDING → RESERVED.
 * Reserves stock for every item in the order inside a single
 * transaction: either all items reserve, or none do.
 */
export async function checkoutOrder(orderId: string) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new OrderNotFoundError(orderId);

      assertTransition(order.status, "RESERVED");

      for (const item of order.items) {
        await reserveOne(item.productId, item.qty, session);
      }

      order.status = "RESERVED";
      order.expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
      await order.save({ session });

      result = order;
    });

    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Releases stock for an order and moves it to the given terminal
 * (or PAID) status. Used by cancel, expire, and payment-failure flows.
 */
async function releaseOrderStock(
  order: InstanceType<typeof Order>,
  toStatus: OrderStatus,
  session: mongoose.ClientSession
) {
  assertTransition(order.status, toStatus);

  if (RESERVING_STATUSES.includes(order.status)) {
    for (const item of order.items) {
      await releaseOne(item.productId, item.qty, session);
    }
  }

  order.status = toStatus;
  await order.save({ session });
  return order;
}

/**
 * Cancels an order (from PENDING, RESERVED, or PAID) and restores
 * any reserved stock.
 */
export async function cancelOrder(orderId: string) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new OrderNotFoundError(orderId);

      result = await releaseOrderStock(order, "CANCELLED", session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Marks a single RESERVED order as EXPIRED and releases its stock.
 * Called both lazily (checked at read time) and by the cron sweeper.
 */
async function expireOrder(orderId: mongoose.Types.ObjectId) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) return;
      if (order.status !== "RESERVED") return; // already handled elsewhere
      if (!order.expiresAt || order.expiresAt > new Date()) return; // not actually expired

      await releaseOrderStock(order, "EXPIRED", session);
    });
  } finally {
    await session.endSession();
  }
}

/**
 * Finds every RESERVED order whose reservation window has passed,
 * and expires each one (releasing stock). Safe to call repeatedly —
 * this is both the lazy-expiry check and what the cron route calls.
 */
export async function releaseExpiredReservations() {
  const expired = await Order.find({
    status: "RESERVED",
    expiresAt: { $lt: new Date() },
  }).select("_id");

  for (const { _id } of expired) {
    await expireOrder(_id);
  }

  return expired.length;
}

/**
 * Completes payment for a RESERVED order. On success, stock is reduced
 * and reserved stock is released. On failure/timeout, the reservation is
 * released and the order is marked FAILED.
 */
export async function payForOrder(
  orderId: string,
  outcome: PaymentOutcome,
  idempotencyKey?: string
) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new OrderNotFoundError(orderId);

      const targetStatus = outcome === "success" ? "PAID" : "FAILED";
      assertTransition(order.status, targetStatus);

      if (idempotencyKey && order.idempotencyKey !== idempotencyKey) {
        order.idempotencyKey = idempotencyKey;
      }

      const paymentResult = simulatePayment(outcome);

      order.payment = {
        status: paymentResult.status,
        processedAt: paymentResult.processedAt,
      };

      if (outcome === "success") {
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: -item.qty, reserved: -item.qty } },
            { session }
          );
        }
      } else {
        for (const item of order.items) {
          await releaseOne(item.productId, item.qty, session);
        }
      }

      order.status = targetStatus;
      await order.save({ session });
      result = order;
    });

    return result;
  } finally {
    await session.endSession();
  }
}