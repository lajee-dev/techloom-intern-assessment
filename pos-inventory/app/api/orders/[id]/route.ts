// app/api/orders/[id]/route.ts
import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await context.params;
  const order = await Order.findById(id);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(order);
}