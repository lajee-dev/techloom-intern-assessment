import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product";

export async function GET() {
  await dbConnect();
  const products = await Product.find().sort({ createdAt: -1 });
  return Response.json(products);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  const { name, price, stock, imageUrl, imagePublicId } = body;
  if (!name || price == null || stock == null) {
    return Response.json(
      { error: "name, price, and stock are required" },
      { status: 400 }
    );
  }

  const product = await Product.create({ name, price, stock, imageUrl, imagePublicId, reserved: 0 });
  return Response.json(product, { status: 201 });
}
