import { Types } from "mongoose";

import { dbConnect } from "@/lib/db";
import OrderModel from "@/lib/models/Order";
import { getOrCreateUserId } from "@/lib/userIdentity";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const userId = await getOrCreateUserId();
  await dbConnect();
  const order = await OrderModel.findOne({ _id: id, userId }).exec();

  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "pending") {
    return Response.json({ error: "Only pending orders can be checked out" }, { status: 409 });
  }

  if (order.expiresAt <= new Date()) {
    return Response.json({ error: "Order reservation has expired" }, { status: 409 });
  }

  order.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await order.save();

  return Response.json({ order });
}