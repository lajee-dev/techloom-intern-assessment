import products from "@/data/products.json";
import ProductModel from "@/lib/models/Product";

export async function ensureDemoProducts() {
  if (process.env.NODE_ENV === "production" || await ProductModel.exists({})) {
    return;
  }

  await ProductModel.insertMany(products);
}