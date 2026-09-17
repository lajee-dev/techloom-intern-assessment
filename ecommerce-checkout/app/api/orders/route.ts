import { Types } from "mongoose";

import { dbConnect } from "@/lib/db";
import OrderModel from "@/lib/models/Order";
import ProductModel from "@/lib/models/Product";
import { releaseStock, reserveStock } from "@/lib/reservationService";
import { getOrCreateUserId } from "@/lib/userIdentity";

type OrderItemInput = { productId: string; quantity: number };

function isOrderItemInput(value: unknown): value is OrderItemInput {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as OrderItemInput).productId === "string" &&
    Types.ObjectId.isValid((value as OrderItemInput).productId) &&
    Number.isInteger((value as OrderItemInput).quantity) &&
    (value as OrderItemInput).quantity > 0
  );
}

export async function GET(request: Request) {
  const userId = await getOrCreateUserId();
  const requestedUserId = new URL(request.url).searchParams.get("userId");

  if (requestedUserId && requestedUserId !== userId) {
    return Response.json({ error: "Orders belong to the current user" }, { status: 403 });
  }

  await dbConnect();
  const orders = await OrderModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();

  return Response.json({ orders, userId });
}

export async function POST(request: Request) {
  let body: { items?: unknown; idempotencyKey?: unknown };

  try {
    body = (await request.json()) as { items?: unknown; idempotencyKey?: unknown };
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items.filter(isOrderItemInput) : [];
  const idempotencyKey =
    typeof body.idempotencyKey === "string"
      ? body.idempotencyKey.trim()
      : request.headers.get("idempotency-key")?.trim();

  if (items.length === 0 || items.length !== (Array.isArray(body.items) ? body.items.length : 0)) {
    return Response.json({ error: "items must contain valid productId and quantity values" }, { status: 400 });
  }

  if (!idempotencyKey) {
    return Response.json({ error: "idempotencyKey is required" }, { status: 400 });
  }

  const userId = await getOrCreateUserId();
  await dbConnect();
  const existingOrder = await OrderModel.findOne({ idempotencyKey }).exec();

  if (existingOrder) {
    if (existingOrder.userId !== userId) {
      return Response.json({ error: "Idempotency key already exists" }, { status: 409 });
    }
    return Response.json({ order: existingOrder }, { status: 200 });
  }

  const productIds = items.map((item) => new Types.ObjectId(item.productId));
  const products = await ProductModel.find({ _id: { $in: productIds } }).exec();
  const productsById = new Map(products.map((product) => [product.id, product]));

  if (productsById.size !== new Set(items.map((item) => item.productId)).size) {
    return Response.json({ error: "One or more products were not found" }, { status: 404 });
  }

  const reservedItems: OrderItemInput[] = [];

  try {
    for (const item of items) {
      const reservedProduct = await reserveStock(item.productId, item.quantity);
      if (!reservedProduct) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
      reservedItems.push(item);
    }

    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId)!;
      return {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      };
    });
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await OrderModel.create({
      items: orderItems,
      total,
      status: "pending",
      idempotencyKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userId,
    });

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    await Promise.all(
      reservedItems.map((item) => releaseStock(item.productId, item.quantity))
    );
    const message = error instanceof Error ? error.message : "Unable to create order";
    return Response.json({ error: message }, { status: 409 });
  }
}