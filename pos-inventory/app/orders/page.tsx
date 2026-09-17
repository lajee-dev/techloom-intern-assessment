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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#999",
  RESERVED: "#e0a800",
  PAID: "#28a745",
  CANCELLED: "#6c757d",
  EXPIRED: "#dc3545",
  FAILED: "#dc3545",
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

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>POS — Orders</h1>
      <nav style={{ marginBottom: 20 }}>
        <a href="/">Products</a> | <a href="/orders">Orders</a>
      </nav>

      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
            <th>ID</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                {o._id.slice(-6)}
              </td>
              <td>
                {o.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
              </td>
              <td>${o.total.toFixed(2)}</td>
              <td>
                <span
                  style={{
                    color: "#fff",
                    background: STATUS_COLORS[o.status] ?? "#333",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {o.status}
                </span>
              </td>
              <td style={{ fontSize: 12 }}>
                {o.expiresAt ? new Date(o.expiresAt).toLocaleTimeString() : "—"}
              </td>
              <td>
                {o.status === "PENDING" && (
                  <button disabled={busyId === o._id} onClick={() => checkout(o._id)}>
                    Checkout
                  </button>
                )}
                {o.status === "RESERVED" && (
                  <>
                    <button disabled={busyId === o._id} onClick={() => pay(o._id, "success")}>
                      Pay ✓
                    </button>{" "}
                    <button disabled={busyId === o._id} onClick={() => pay(o._id, "failure")}>
                      Pay ✗
                    </button>{" "}
                    <button disabled={busyId === o._id} onClick={() => pay(o._id, "timeout")}>
                      Pay ⏱
                    </button>
                  </>
                )}
                {(o.status === "PENDING" || o.status === "RESERVED" || o.status === "PAID") && (
                  <>
                    {" "}
                    <button disabled={busyId === o._id} onClick={() => cancel(o._id)}>
                      Cancel
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}