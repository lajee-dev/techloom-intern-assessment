import { dbConnect } from "@/lib/db";
import { ensureDemoProducts } from "@/lib/demoProducts";
import ProductModel from "@/lib/models/Product";
import { getOrCreateUserId } from "@/lib/userIdentity";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const inStock = searchParams.get("inStock");
  const query: Record<string, unknown> = {};

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (category) {
    query.category = category;
  }

  const price: Record<string, number> = {};

  if (minPrice !== null) {
    const value = Number(minPrice);
    if (!Number.isFinite(value) || value < 0) {
      return Response.json({ error: "minPrice must be a non-negative number" }, { status: 400 });
    }
    price.$gte = value;
  }

  if (maxPrice !== null) {
    const value = Number(maxPrice);
    if (!Number.isFinite(value) || value < 0) {
      return Response.json({ error: "maxPrice must be a non-negative number" }, { status: 400 });
    }
    price.$lte = value;
  }

  if (Object.keys(price).length > 0) {
    query.price = price;
  }

  if (inStock !== null) {
    if (inStock !== "true" && inStock !== "false") {
      return Response.json({ error: "inStock must be true or false" }, { status: 400 });
    }

    query.$expr = inStock === "true"
      ? { $gt: [{ $subtract: ["$stock", "$reserved"] }, 0] }
      : { $lte: [{ $subtract: ["$stock", "$reserved"] }, 0] };
  }

  const userId = await getOrCreateUserId();
  await dbConnect();
  await ensureDemoProducts();
  const products = await ProductModel.find(query).sort({ createdAt: -1 }).lean().exec();

  return Response.json({ products, userId });
}