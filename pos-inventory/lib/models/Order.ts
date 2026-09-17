// models/Order.ts
import mongoose, { Schema, model, models, Document, Model } from "mongoose";

export type OrderStatus =
  | "PENDING"
  | "RESERVED"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

export type PaymentOutcome = "success" | "failure" | "timeout";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  qty: number;
  price: number;
}

export interface IPayment {
  status: PaymentOutcome | null;
  processedAt: Date | null;
}

export interface IOrder extends Document {
  items: IOrderItem[];
  total: number;
  status: OrderStatus;
  idempotencyKey: string;
  expiresAt: Date | null;
  payment: IPayment;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
  {
    status: {
      type: String,
      enum: ["success", "failure", "timeout", null],
      default: null,
    },
    processedAt: { type: Date, default: null },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: (v: IOrderItem[]) => v.length > 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "RESERVED", "PAID", "CANCELLED", "EXPIRED", "FAILED"],
      default: "PENDING",
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    payment: {
      type: PaymentSchema,
      default: () => ({ status: null, processedAt: null }),
    },
  },
  { timestamps: true }
);

// Speeds up the expiry sweep query: status=RESERVED AND expiresAt < now
OrderSchema.index({ status: 1, expiresAt: 1 });

const Order: Model<IOrder> =
  models.Order || model<IOrder>("Order", OrderSchema);

export default Order;