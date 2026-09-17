// app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";

interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  _id: string;
  items: OrderItem[];
  total: number;
  status: string;
  expiresAt: string | null;
  payment: { status: string | null; processedAt: string | null };
  createdAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: "status-pending",
  RESERVED: "status-reserved",
  PAID: "status-paid",
  CANCELLED: "status-cancelled",
  EXPIRED: "status-expired",
  FAILED: "status-failed",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadOrders() {
    const res = await fetch("/api/orders");
    setOrders(await res.json());
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function checkout(id: string) {
    setBusyId(id);
    await fetch(`/api/orders/${id}/checkout`, { method: "POST" });
    await loadOrders();
    setBusyId(null);
  }

  async function pay(id: string, outcome: "success" | "failure" | "timeout") {
    setBusyId(id);
    await fetch(`/api/orders/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, idempotencyKey: crypto.randomUUID() }),
    });
    await loadOrders();
    setBusyId(null);
  }

  async function cancel(id: string) {
    setBusyId(id);
    await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
    await loadOrders();
    setBusyId(null);
  }

  const openOrders = orders.filter((order) => order.status === "PENDING" || order.status === "RESERVED").length;
  const paidOrders = orders.filter((order) => order.status === "PAID").length;
  const revenue = orders.filter((order) => order.status === "PAID").reduce((sum, order) => sum + order.total, 0);

  return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand"><span className="brand-mark">L</span> Ledger</div>
          <span className="topbar-note">Inventory operations / live workspace</span>
        </header>
        <main className="workspace">
          <div className="page-heading">
            <div><p className="eyebrow">Order desk</p><h1>Orders</h1><p className="lede">Track reservations, payments, and the next action for every sale.</p></div>
            <nav className="nav-tabs" aria-label="Primary navigation"><a href="/">Products</a><a className="active" href="/orders">Orders</a></nav>
          </div>
          <section className="stat-grid" aria-label="Order summary">
            <div className="stat-card"><span className="stat-label">Total orders</span><strong className="stat-value">{orders.length}</strong></div>
            <div className="stat-card"><span className="stat-label">Needs attention</span><strong className="stat-value">{openOrders}</strong></div>
            <div className="stat-card"><span className="stat-label">Paid revenue</span><strong className="stat-value">${revenue.toFixed(2)} <small className="panel-caption">/ {paidOrders} paid</small></strong></div>
          </section>
          <section className="panel">
            <div className="panel-header"><h2 className="panel-title">Order activity</h2><span className="panel-caption">Newest first</span></div>
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th>Reservation</th><th>Actions</th></tr></thead><tbody>
              {orders.length === 0 ? <tr><td colSpan={6} className="empty-state">No orders yet. Orders will appear here once created.</td></tr> : orders.map((order) => <tr key={order._id}>
                <td><div className="product-name">#{order._id.slice(-6)}</div><div className="product-id">{new Date(order.createdAt).toLocaleDateString()}</div></td>
                <td>{order.items.map((item) => `${item.name} x${item.qty}`).join(", ")}</td>
                <td className="number-cell">${order.total.toFixed(2)}</td>
                <td><span className={`status ${STATUS_CLASS[order.status] ?? "status-cancelled"}`}>{order.status}</span></td>
                <td className="panel-caption">{order.expiresAt ? new Date(order.expiresAt).toLocaleTimeString() : "No timer"}</td>
                <td><div className="order-actions">
                  {order.status === "PENDING" && <button className="button-primary" disabled={busyId === order._id} onClick={() => checkout(order._id)}>Checkout</button>}
                  {order.status === "RESERVED" && <><button className="button-primary" disabled={busyId === order._id} onClick={() => pay(order._id, "success")}>Pay</button><button className="button-quiet" disabled={busyId === order._id} onClick={() => pay(order._id, "failure")}>Decline</button></>}
                  {(order.status === "PENDING" || order.status === "RESERVED" || order.status === "PAID") && <button className="button-danger" disabled={busyId === order._id} onClick={() => cancel(order._id)}>Cancel</button>}
                </div></td>
              </tr>)}
            </tbody></table></div>
          </section>
        </main>
      </div>
    );
  }
