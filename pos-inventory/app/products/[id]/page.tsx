"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Product {
  _id: string;
  name: string;
  imageUrl?: string;
  price: number;
  stock: number;
  reserved: number;
  available: number;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/products/${id}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Product not found");
          return response.json();
        })
        .then(setProduct)
        .catch((reason: Error) => setError(reason.message));
    });
  }, [params]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">L</span> Ledger</div>
        <span className="topbar-note">Inventory operations / product detail</span>
      </header>
      <main className="workspace">
        <Link className="back-link" href="/">← Back to products</Link>
        {error ? (
          <section className="detail-panel"><p className="eyebrow">Not found</p><h1>{error}</h1></section>
        ) : !product ? (
          <section className="detail-panel"><p className="lede">Loading product...</p></section>
        ) : (
          <section className="detail-panel">
            <div className="detail-image-wrap">
              {product.imageUrl ? <img className="detail-image" src={product.imageUrl} alt={product.name} /> : <div className="detail-image detail-image-empty">No image</div>}
            </div>
            <div className="detail-copy">
              <p className="eyebrow">Product detail</p>
              <h1>{product.name}</h1>
              <p className="detail-id">ID {product._id}</p>
              <strong className="detail-price">${product.price.toFixed(2)}</strong>
              <div className="detail-stats">
                <div><span>On hand</span><strong>{product.stock}</strong></div>
                <div><span>Reserved</span><strong>{product.reserved}</strong></div>
                <div><span>Available</span><strong>{product.available}</strong></div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
