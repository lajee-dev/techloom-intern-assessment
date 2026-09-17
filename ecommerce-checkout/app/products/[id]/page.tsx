"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import StoreHeader from "@/app/components/StoreHeader";

type Product = { _id: string; name: string; price: number; category: string; stock: number; reserved: number; imageUrl?: string };

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("Loading product...");

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Product not found");
        setProduct(data.product);
        setMessage("");
      })
      .catch((error: Error) => setMessage(error.message));
  }, [id]);

  async function addToCart() {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id, quantity }),
    });
    setMessage(response.ok ? "Added to your cart." : "Could not add this item.");
  }

  return <>
    <StoreHeader />
    <main className="page-shell">
      {product ? <div className="detail-grid">
        <div className="detail-visual">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : product.name.slice(0, 1)}</div>
        <div className="detail-copy">
          <Link className="eyebrow" href="/">Back to collection</Link>
          <p className="product-meta" style={{ marginTop: 38 }}>{product.category}</p>
          <h1>{product.name}</h1>
          <span className="detail-price">${product.price.toFixed(2)}</span>
          <p>A considered everyday object with a practical shape and a little character. Kept in small quantities so each piece earns its place.</p>
          <p className="stock-note">{Math.max(product.stock - product.reserved, 0)} available now</p>
          <div className="quantity-row">
            <label><span className="field-label">Quantity</span><input className="input" type="number" min="1" max={Math.max(product.stock - product.reserved, 1)} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label>
            <button className="button coral" disabled={product.stock - product.reserved < 1} onClick={addToCart}>Add to cart</button>
          </div>
          {message && <p className={message.includes("Added") ? "success" : "notice"} style={{ marginTop: 18 }}>{message}</p>}
        </div>
      </div> : <div className="empty-state">{message}</div>}
    </main>
  </>;
}
