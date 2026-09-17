// app/api/orders/[id]/cancel/route.ts
import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import { cancelOrder, OrderNotFoundError } from "@/lib/reservationService";
import { InvalidTransitionError } from "@/lib/orderStateMachine";

// POST /api/orders/[id]/cancel — restores stock, -> CANCELLED
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await context.params;

  try {
    const order = await cancelOrder(id);
    return Response.json(order);
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidTransitionError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Cancellation failed" }, { status: 500 });
  }
}