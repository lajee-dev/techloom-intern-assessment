// models/Product.ts
import mongoose, { Schema, model, models, Document, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  price: number;
  stock: number;
  reserved: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reserved: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

// Virtual: stock actually available to purchase right now
ProductSchema.virtual("available").get(function (this: IProduct) {
  return this.stock - this.reserved;
});

ProductSchema.set("toJSON", { virtuals: true });
ProductSchema.set("toObject", { virtuals: true });

const Product: Model<IProduct> =
  models.Product || model<IProduct>("Product", ProductSchema);

export default Product;