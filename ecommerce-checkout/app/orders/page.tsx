"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StoreHeader from "@/app/components/StoreHeader";

type OrderItem = { name: string; quantity: number; price: number };
type Order = { _id: string; total: number; status: string; items: OrderItem[]; createdAt: string; refund?: { status?: string } };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("Loading your orders...");

  async function loadOrders() {
    const response = await fetch("/api/orders");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not load orders");
    setOrders(data.orders ?? []);
    setMessage("");
  }
  useEffect(() => {
    queueMicrotask(() => loadOrders().catch((error: Error) => setMessage(error.message)));
  }, []);

  async function action(id: string, kind: "cancel" | "refund") {
    const response = await fetch(`/api/orders/${id}/${kind}`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) setMessage(data.error ?? `Could not ${kind} order.`);
    else loadOrders();
  }

  return <>
    <StoreHeader />
    <main className="page-shell">
      <p className="eyebrow">Your account</p><h1 className="section-title" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", margin: "10px 0 36px" }}>Order history.</h1>
      {message && <div className="empty-state">{message}</div>}
      {!message && orders.length === 0 && <div className="empty-state">Nothing here yet. <Link href="/" style={{ color: "var(--teal)", fontWeight: 700 }}>Start shopping.</Link></div>}
      <section className="order-list">{orders.map((order) => { const status = order.refund?.status === "REFUNDED" ? "refunded" : order.status; return <article className="order-card" key={order._id}>
        <div className="order-header"><div><span className="eyebrow">Order {order._id.slice(-8)}</span><p className="muted" style={{ marginTop: 6 }}>{new Date(order.createdAt).toLocaleDateString()}</p></div><span className={`status ${status}`}>{status}</span></div>
        <div className="order-items">{order.items.map((item) => <div key={`${order._id}-${item.name}`}>{item.name} x {item.quantity} <strong>${(item.price * item.quantity).toFixed(2)}</strong></div>)}</div>
        <div className="order-header"><strong className="price">${order.total.toFixed(2)}</strong><div className="order-actions">{(order.status === "pending" || order.status === "paid") && <button className="button secondary" onClick={() => action(order._id, "cancel")}>Cancel order</button>}{(order.status === "cancelled" || order.status === "failed") && order.refund?.status !== "REFUNDED" && <button className="button coral" onClick={() => action(order._id, "refund")}>Request refund</button>}</div></div>
      </article>; })}</section>
    </main>
  </>;
}
