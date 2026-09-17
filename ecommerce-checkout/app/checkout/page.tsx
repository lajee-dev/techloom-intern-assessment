"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StoreHeader from "@/app/components/StoreHeader";

type CartItem = { productId: string; quantity: number };
type Product = { name: string; price: number };
type Order = { _id: string; total: number; status: string; payment?: { status?: string } };

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("Loading your checkout...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/cart")
      .then((response) => response.json())
      .then(async (data) => {
        const nextCart = data.cart ?? [];
        setCart(nextCart);
        const entries = await Promise.all(nextCart.map(async (item: CartItem) => {
          const response = await fetch(`/api/products/${item.productId}`);
          if (!response.ok) return null;
          const product = (await response.json()).product;
          return [item.productId, product] as const;
        }));
        setProducts(Object.fromEntries(entries.filter(Boolean) as [string, Product][]));
        setMessage(nextCart.length ? "" : "Your cart is empty.");
      })
      .catch(() => setMessage("Could not load your checkout."));
  }, []);

  async function reserve() {
    setBusy(true);
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart, idempotencyKey: `checkout-${crypto.randomUUID()}` }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not reserve your items."); setBusy(false); return; }
    const checkoutResponse = await fetch(`/api/orders/${data.order._id}/checkout`, { method: "POST" });
    const checkoutData = await checkoutResponse.json();
    if (!checkoutResponse.ok) setMessage(checkoutData.error ?? "Could not begin checkout."); else setOrder(checkoutData.order);
    setBusy(false);
  }

  async function pay() {
    if (!order) return;
    setBusy(true);
    const response = await fetch(`/api/orders/${order._id}/pay`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      setOrder(data.order);
      await Promise.all(cart.map((item) => fetch("/api/cart", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: item.productId }) })));
      setMessage("Payment approved. Your order is on its way.");
    } else setMessage(data.error ?? "Payment could not be completed.");
    setBusy(false);
  }

  const total = cart.reduce((sum, item) => sum + (products[item.productId]?.price ?? 0) * item.quantity, 0);

  return <>
    <StoreHeader />
    <main className="page-shell">
      <p className="eyebrow">Secure, simulated checkout</p><h1 className="section-title" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", margin: "10px 0 36px" }}>Make it yours.</h1>
      {message && <p className={message.includes("approved") ? "success" : "notice"} style={{ marginBottom: 22 }}>{message}</p>}
      {cart.length > 0 && <div className="checkout-layout"><section className="panel"><p className="eyebrow">Your order</p>{cart.map((item) => <div className="summary-row" key={item.productId}><span>{products[item.productId]?.name ?? "Product"} x {item.quantity}</span><strong>${((products[item.productId]?.price ?? 0) * item.quantity).toFixed(2)}</strong></div>)}</section><aside className="panel"><p className="eyebrow">Total</p><div className="summary-row summary-total"><span>Due today</span><span>${(order?.total ?? total).toFixed(2)}</span></div><div className="action-stack">{!order ? <button className="button coral" disabled={busy} onClick={reserve}>{busy ? "Reserving..." : "Reserve stock"}</button> : order.status === "pending" ? <button className="button coral" disabled={busy} onClick={pay}>{busy ? "Processing..." : "Pay with mock card"}</button> : <span className="status paid">Payment {order.payment?.status ?? order.status}</span>}<Link className="button secondary" href="/cart">Back to cart</Link></div></aside></div>}
    </main>
  </>;
}
