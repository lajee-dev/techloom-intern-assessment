"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StoreHeader from "@/app/components/StoreHeader";

type Product = {
  _id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  reserved: number;
  imageUrl?: string;
};

function ProductVisual({ product }: { product: Product }) {
  return (
    <div className="product-visual">
      {product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.name.slice(0, 1)}
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStock, setInStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (category) query.set("category", category);
    if (minPrice) query.set("minPrice", minPrice);
    if (maxPrice) query.set("maxPrice", maxPrice);
    if (inStock) query.set("inStock", "true");

    fetch(`/api/products?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setProducts(data.products ?? []))
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setMessage("Could not load the collection.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search, category, minPrice, maxPrice, inStock]);

  async function addToCart(productId: string) {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    setMessage(response.ok ? "Added to your cart." : "Could not add that item.");
  }

  return (
    <>
      <StoreHeader />
      <main className="page-shell">
        <section className="page-intro">
          <div>
            <p className="eyebrow">Small batch / considered goods</p>
            <h1 className="display-title">Useful things, made to last.</h1>
          </div>
          <p className="muted" style={{ maxWidth: 260 }}>Objects with a quiet point of view for desks, kitchens, and daily rituals.</p>
        </section>

        <section className="toolbar" aria-label="Product filters">
          <label><span className="field-label">Search</span><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try linen, ceramic..." /></label>
          <label><span className="field-label">Category</span><input className="input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="All categories" /></label>
          <label><span className="field-label">Min price</span><input className="input" type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="$0" /></label>
          <label><span className="field-label">Max price</span><input className="input" type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="$500" /></label>
          <label style={{ alignItems: "center", display: "flex", gap: 8, minHeight: 46 }}><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /> In stock</label>
        </section>

        {message && <p className="success" style={{ marginBottom: 22 }}>{message}</p>}
        {loading ? <p className="muted">Loading the collection...</p> : products.length === 0 ? <div className="empty-state">No pieces match those filters.</div> : (
          <section className="product-grid">
            {products.map((product) => {
              const available = product.stock - product.reserved;
              return <article className="product-card" key={product._id}>
                <Link href={`/products/${product._id}`}><ProductVisual product={product} /></Link>
                <div className="product-info">
                  <span className="product-meta">{product.category}</span>
                  <Link href={`/products/${product._id}`}><h2 className="product-name">{product.name}</h2></Link>
                  <div className="product-row"><span className="price">${product.price.toFixed(2)}</span><span className="stock-note">{available > 0 ? `${available} available` : "Sold out"}</span></div>
                  <button className="button" disabled={available < 1} onClick={() => addToCart(product._id)} style={{ marginTop: 17, width: "100%" }}>Add to cart</button>
                </div>
              </article>;
            })}
          </section>
        )}
      </main>
    </>
  );
}
