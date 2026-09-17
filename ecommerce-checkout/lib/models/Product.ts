import { model, models, Schema, type InferSchemaType } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
    reserved: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    imageUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

export type Product = InferSchemaType<typeof productSchema>;

export const ProductModel = models.Product || model("Product", productSchema);

export default ProductModel;