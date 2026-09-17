import { Types } from "mongoose";

import { dbConnect } from "@/lib/db";
import ProductModel from "@/lib/models/Product";

export async function reserveStock(
  productId: string | Types.ObjectId,
  quantity: number
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  await dbConnect();

  return ProductModel.findOneAndUpdate(
    {
      _id: productId,
      $expr: {
        $lte: [{ $add: ["$reserved", quantity] }, "$stock"],
      },
    },
    { $inc: { reserved: quantity } },
    { new: true, runValidators: true }
  ).exec();
}

export async function releaseStock(
  productId: string | Types.ObjectId,
  quantity: number
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  await dbConnect();

  return ProductModel.findOneAndUpdate(
    {
      _id: productId,
      $expr: {
        $gte: ["$reserved", quantity],
      },
    },
    { $inc: { reserved: -quantity } },
    { new: true, runValidators: true }
  ).exec();
}