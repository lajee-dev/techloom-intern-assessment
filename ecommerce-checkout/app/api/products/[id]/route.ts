import { Types } from "mongoose";

import { dbConnect } from "@/lib/db";
import ProductModel from "@/lib/models/Product";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await dbConnect();
  const product = await ProductModel.findById(id).lean().exec();

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  return Response.json({ product });
}