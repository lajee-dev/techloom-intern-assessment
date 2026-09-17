// app/api/products/route.ts
import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product";

// GET /api/products — list all products with live available stock
export async function GET() {
  await dbConnect();
  const products = await Product.find().sort({ createdAt: -1 });
  return Response.json(products);
}

// POST /api/products — create a product
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  const { name, price, stock } = body;
  if (!name || price == null || stock == null) {
    return Response.json(
      { error: "name, price, and stock are required" },
      { status: 400 }
    );
  }

  const product = await Product.create({ name, price, stock, reserved: 0 });
  return Response.json(product, { status: 201 });
}