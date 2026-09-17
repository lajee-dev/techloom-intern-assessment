import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import { payForOrder, OrderNotFoundError } from "@/lib/reservationService";
import { InvalidTransitionError } from "@/lib/orderStateMachine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await context.params;

  try {
    const body = await req.json();
    const outcome = body.outcome as "success" | "failure" | "timeout";
    const idempotencyKey = body.idempotencyKey as string | undefined;

    if (!outcome || !["success", "failure", "timeout"].includes(outcome)) {
      return Response.json({ error: "Invalid payment outcome" }, { status: 400 });
    }

    const order = await payForOrder(id, outcome, idempotencyKey);
    return Response.json(order);
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidTransitionError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Payment failed" }, { status: 500 });
  }
}
