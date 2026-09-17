import { dbConnect } from "@/lib/db";
import OrderModel from "@/lib/models/Order";
import { getOrCreateUserId } from "@/lib/userIdentity";

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