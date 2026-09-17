import { model, models, Schema, type InferSchemaType } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    provider: { type: String, trim: true },
    paymentIntentId: { type: String, trim: true },
    status: { type: String, trim: true },
    transactionId: { type: String, trim: true },
  },
  { _id: false }
);

const refundSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processed", "failed", "REFUNDED"],
    },
    amount: { type: Number, min: 0 },
    processedAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    items: { type: [orderItemSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    idempotencyKey: { type: String, required: true, unique: true, trim: true },
    expiresAt: { type: Date, required: true },
    payment: { type: paymentSchema },
    userId: { type: String, required: true, trim: true },
    refund: { type: refundSchema },
  },
  { timestamps: true }
);

orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Order = InferSchemaType<typeof orderSchema>;

export const OrderModel = models.Order || model("Order", orderSchema);

export default OrderModel;