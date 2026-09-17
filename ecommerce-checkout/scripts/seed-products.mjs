import fs from "node:fs";
import mongoose from "mongoose";

function loadLocalMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  try {
    const envFile = fs.readFileSync(".env.local", "utf8");
    const match = envFile.match(/^MONGODB_URI=(.*)$/m);
    return match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

const uri = loadLocalMongoUri();

if (!uri) {
  throw new Error("Set MONGODB_URI before running the product seed.");
}

const products = JSON.parse(fs.readFileSync("data/products.json", "utf8"));
await mongoose.connect(uri);

const collection = mongoose.connection.collection("products");
for (const product of products) {
  await collection.updateOne(
    { name: product.name },
    { $setOnInsert: { ...product, createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );
}

console.log(`Seeded ${products.length} products.`);
await mongoose.disconnect();