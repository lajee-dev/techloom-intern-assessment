import { Types } from "mongoose";

import { dbConnect } from "@/lib/db";
import OrderModel from "@/lib/models/Order";
import { releaseStock } from "@/lib/reservationService";
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

  if (order.status !== "pending" && order.status !== "paid") {
    return Response.json({ error: "This order cannot be cancelled" }, { status: 409 });
  }

  for (const item of order.items) {
    const releasedProduct = await releaseStock(item.productId, item.quantity);
    if (!releasedProduct) {
      return Response.json({ error: "Unable to release the order reservation" }, { status: 409 });
    }
  }

  order.status = "cancelled";
  await order.save();

  return Response.json({ order });
}