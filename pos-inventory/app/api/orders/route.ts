// app/api/orders/route.ts
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { releaseExpiredReservations } from "@/lib/reservationService";

interface CreateOrderItem {
  productId: string;
  qty: number;
}

// GET /api/orders — admin view, all orders
export async function GET() {
  await dbConnect();
  await releaseExpiredReservations(); // lazy sweep before listing
  const orders = await Order.find().sort({ createdAt: -1 });
  return Response.json(orders);
}

// POST /api/orders — cart -> order, status PENDING
// Does NOT reserve stock yet; that happens at /checkout.
export async function POST(req: NextRequest) {
  await dbConnect();

  const body = await req.json();
  const items: CreateOrderItem[] = body.items;

  if (!items || items.length === 0) {
    return Response.json({ error: "items are required" }, { status: 400 });
  }

  // Validate products exist and snapshot name/price at order time,
  // and confirm enough *total* stock exists (soft check — the hard,
  // race-safe check happens atomically at checkout).
  const orderItems = [];
  let total = 0;

  for (const { productId, qty } of items) {
    if (!qty || qty < 1) {
      return Response.json({ error: "Invalid quantity" }, { status: 400 });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return Response.json(
        { error: `Product ${productId} not found` },
        { status: 404 }
      );
    }
    if (product.stock - product.reserved < qty) {
      return Response.json(
        { error: `Insufficient stock for ${product.name}` },
        { status: 409 }
      );
    }

    orderItems.push({
      productId: product._id,
      name: product.name,
      qty,
      price: product.price,
    });
    total += product.price * qty;
  }

  const order = await Order.create({
    items: orderItems,
    total,
    status: "PENDING",
    idempotencyKey: randomUUID(),
  });

  return Response.json(order, { status: 201 });
}