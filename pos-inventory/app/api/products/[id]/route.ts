// app/api/products/[id]/route.ts
import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await context.params;
  const product = await Product.findById(id);
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(product);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await context.params;
  const body = await req.json();

  // Only allow safe fields to be edited directly.
  // `reserved` is never client-editable — it's only ever changed
  // by the reservation service.
  const { name, price, stock } = body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (price !== undefined) update.price = price;
  if (stock !== undefined) update.stock = stock;

  const product = await Product.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
    returnDocument: "after",
  });

  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(product);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await context.params;
  const product = await Product.findByIdAndDelete(id);
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ deleted: true });
}