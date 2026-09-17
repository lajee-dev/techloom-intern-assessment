import { dbConnect } from "@/lib/db";
import OrderModel from "@/lib/models/Order";
import { releaseStock } from "@/lib/reservationService";

export async function GET() {
  await dbConnect();
  const expiredOrders = await OrderModel.find({
    status: "pending",
    expiresAt: { $lte: new Date() },
  }).exec();
  let released = 0;
  const errors: string[] = [];

  for (const order of expiredOrders) {
    try {
      for (const item of order.items) {
        const product = await releaseStock(item.productId, item.quantity);
        if (!product) {
          throw new Error(`Unable to release product ${item.productId}`);
        }
      }

      order.status = "cancelled";
      await order.save();
      released += 1;
    } catch (error) {
      errors.push(order.id);
      console.error("Failed to release expired order", order.id, error);
    }
  }

  return Response.json({
    expired: expiredOrders.length,
    released,
    errors,
  });
}