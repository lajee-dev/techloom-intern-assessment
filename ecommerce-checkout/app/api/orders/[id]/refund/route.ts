import { Types } from "mongoose";

import { dbConnect } from "@/lib/db";
import OrderModel from "@/lib/models/Order";
import { getOrCreateUserId } from "@/lib/userIdentity";

type RefundContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RefundContext) {
  void request;
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const userId = await getOrCreateUserId();
  await dbConnect();
  const order = await OrderModel.findOne({ _id: id, userId }).exec();

  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const normalizedStatus = order.status.toLowerCase();
  const paymentStatus = order.payment?.status?.toLowerCase();
  const canRefund =
    normalizedStatus === "cancelled" ||
    (normalizedStatus === "failed" &&
      (paymentStatus === "paid" || paymentStatus === "succeeded"));

  if (!canRefund) {
    return Response.json(
      { error: "Only cancelled or payment-failed orders can be refunded" },
      { status: 409 }
    );
  }

  order.refund = {
    status: "REFUNDED",
    amount: order.total,
    processedAt: new Date(),
  };
  await order.save();

  return Response.json({ order });
}