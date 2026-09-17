"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StoreHeader from "@/app/components/StoreHeader";

type CartItem = { productId: string; quantity: number };
type Product = { _id: string; name: string; price: number; category: string; imageUrl?: string };

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [message, setMessage] = useState("Loading your cart...");

  async function loadCart() {
    const response = await fetch("/api/cart");
    const data = await response.json();
    const nextCart = data.cart ?? [];
    setCart(nextCart);
    const entries = await Promise.all(nextCart.map(async (item: CartItem) => {
      const productResponse = await fetch(`/api/products/${item.productId}`);
      if (!productResponse.ok) return null;
      const productData = await productResponse.json();
      return [item.productId, productData.product] as const;
    }));
    setProducts(Object.fromEntries(entries.filter(Boolean) as [string, Product][]));
    setMessage("");
  }

  useEffect(() => {
    queueMicrotask(() => loadCart().catch(() => setMessage("Could not load your cart.")));
  }, []);

  async function update(productId: string, quantity: number) {
    const response = await fetch("/api/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity }) });
    if (response.ok) loadCart();
  }

  async function remove(productId: string) {
    const response = await fetch("/api/cart", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    if (response.ok) loadCart();
  }

  const total = cart.reduce((sum, item) => sum + (products[item.productId]?.price ?? 0) * item.quantity, 0);

  return <>
    <StoreHeader />
    <main className="page-shell">
      <div className="page-intro" style={{ marginBottom: 36 }}><div><p className="eyebrow">Your selection</p><h1 className="section-title" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", marginTop: 10 }}>The cart.</h1></div><p className="muted">Held here until you are ready to reserve.</p></div>
      {message ? <div className="empty-state">{message}</div> : cart.length === 0 ? <div className="empty-state">Your cart is waiting for something useful. <Link href="/" style={{ color: "var(--teal)", fontWeight: 700 }}>Browse the collection.</Link></div> : <div className="cart-layout">
        <section className="panel">
          {cart.map((item) => { const product = products[item.productId]; if (!product) return null; return <div className="cart-item" key={item.productId}>
            <div><span className="product-meta">{product.category}</span><h2 className="product-name" style={{ marginBottom: 0 }}>{product.name}</h2></div>
            <input className="input" type="number" min="1" value={item.quantity} onChange={(event) => update(item.productId, Math.max(1, Number(event.target.value)))} aria-label={`Quantity for ${product.name}`} />
            <strong className="price">${(product.price * item.quantity).toFixed(2)}</strong>
            <button className="icon-button" onClick={() => remove(item.productId)} aria-label={`Remove ${product.name}`}>×</button>
          </div>; })}
        </section>
        <aside className="panel"><p className="eyebrow">Summary</p><div className="summary-row"><span className="muted">Items</span><span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></div><div className="summary-row summary-total"><span>Total</span><span>${total.toFixed(2)}</span></div><Link className="button coral" href="/checkout" style={{ marginTop: 20, width: "100%" }}>Proceed to checkout</Link></aside>
      </div>}
    </main>
  </>;
}