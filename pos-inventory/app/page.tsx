// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  imageUrl?: string;
  imagePublicId?: string;
  price: number;
  stock: number;
  reserved: number;
  available: number;
}

interface CartItem {
  product: Product;
  qty: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePublicId, setImagePublicId] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  async function loadProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setName("");
    setPrice("");
    setStock("");
    setImageUrl("");
    setImagePublicId("");
    setEditingId(null);
  }

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await response.json();
    setUploadingImage(false);

    if (!response.ok) {
      window.alert(result.error ?? "Image upload failed");
      return;
    }

    setImageUrl(result.secure_url);
    setImagePublicId(result.public_id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = { name, price: Number(price), stock: Number(stock), imageUrl, imagePublicId };

    if (editingId) {
      await fetch(`/api/products/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    await loadProducts();
    setLoading(false);
  }

  function startEdit(p: Product) {
    setEditingId(p._id);
    setName(p.name);
    setPrice(String(p.price));
    setStock(String(p.stock));
    setImageUrl(p.imageUrl ?? "");
    setImagePublicId(p.imagePublicId ?? "");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await loadProducts();
  }

  function addToCart(product: Product) {
    setOrderMessage("");
    setCart((current) => {
      const existing = current.find((item) => item.product._id === product._id);
      if (existing) {
        return current.map((item) => item.product._id === product._id
          ? { ...item, qty: Math.min(item.qty + 1, product.available) }
          : item);
      }
      return [...current, { product, qty: 1 }];
    });
  }

  function updateCartQuantity(id: string, qty: number) {
    if (qty < 1) {
      setCart((current) => current.filter((item) => item.product._id !== id));
      return;
    }
    setCart((current) => current.map((item) => item.product._id === id
      ? { ...item, qty: Math.min(qty, item.product.available) }
      : item));
  }

  async function createOrder() {
    if (cart.length === 0) return;
    setCreatingOrder(true);
    setOrderMessage("");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.map((item) => ({ productId: item.product._id, qty: item.qty })) }),
    });
    const result = await response.json();
    setCreatingOrder(false);
    if (!response.ok) {
      setOrderMessage(result.error ?? "Could not create order");
      return;
    }
    setCart([]);
    window.location.href = "/orders";
  }

  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const availableUnits = products.reduce((sum, product) => sum + product.available, 0);
  const lowStockCount = products.filter((product) => product.available < 5).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">L</span> Ledger</div>
        <span className="topbar-note">Inventory operations / live workspace</span>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Inventory control</p>
            <h1>Products</h1>
            <p className="lede">Keep your catalog tidy and your available stock honest.</p>
          </div>
          <nav className="nav-tabs" aria-label="Primary navigation">
            <a className="active" href="/">Products</a>
            <a href="/orders">Orders</a>
          </nav>
        </div>

        <section className="stat-grid" aria-label="Inventory summary">
          <div className="stat-card"><span className="stat-label">Catalog items</span><strong className="stat-value">{products.length}</strong></div>
          <div className="stat-card"><span className="stat-label">Units on hand</span><strong className="stat-value">{totalUnits}</strong></div>
          <div className="stat-card"><span className="stat-label">Available now</span><strong className="stat-value">{availableUnits} <small className="panel-caption">/ {lowStockCount} low</small></strong></div>
        </section>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="field"><label htmlFor="product-name">Product name</label><input id="product-name" placeholder="e.g. Ceramic mug" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field"><label htmlFor="product-price">Price</label><input id="product-price" placeholder="0.00" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
          <div className="field"><label htmlFor="product-stock">Opening stock</label><input id="product-stock" placeholder="0" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required /></div>
          <div className="field image-field"><label htmlFor="product-image">Product image</label><div className="image-picker">{imageUrl && <img className="upload-preview" src={imageUrl} alt="Selected product" />}<input id="product-image" type="file" accept="image/*" onChange={(e) => handleImageChange(e.target.files?.[0])} disabled={uploadingImage} /></div><span className="field-hint">{uploadingImage ? "Uploading..." : imageUrl ? "Image ready" : "Optional, max 5 MB"}</span></div>
          <button className="button-primary" type="submit" disabled={loading}>{loading ? "Saving..." : editingId ? "Save changes" : "Add product"}</button>
          {editingId && <button className="button-quiet" type="button" onClick={resetForm}>Cancel</button>}
        </form>

        <section className="panel">
          <div className="panel-header"><h2 className="panel-title">Catalog overview</h2><span className="panel-caption">{products.length} records</span></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Price</th><th>On hand</th><th>Reserved</th><th>Available</th><th /></tr></thead>
              <tbody>
                {products.length === 0 ? <tr><td colSpan={6} className="empty-state">No products yet. Add your first item above.</td></tr> : products.map((p) => (
                  <tr key={p._id}>
                    <td><div className="product-cell">{p.imageUrl ? <img className="product-thumb" src={p.imageUrl} alt="" /> : <span className="product-thumb product-thumb-empty">—</span>}<div><Link className="product-name product-link" href={`/products/${p._id}`}>{p.name}</Link><div className="product-id">ID {p._id.slice(-8)}</div></div></div></td>
                    <td className="number-cell">${p.price.toFixed(2)}</td><td className="number-cell">{p.stock}</td><td className="number-cell">{p.reserved}</td>
                    <td className={p.available < 5 ? "low-stock" : "available"}>{p.available}{p.available < 5 && " · low"}</td>
                    <td><div className="action-row"><button className="button-primary" onClick={() => addToCart(p)} disabled={p.available < 1}>Add</button><Link className="button-quiet" href={`/products/${p._id}`}>View</Link><button className="button-quiet" onClick={() => startEdit(p)}>Edit</button><button className="button-danger" onClick={() => handleDelete(p._id)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cart-panel">
          <div className="panel-header"><h2 className="panel-title">Current order</h2><span className="panel-caption">{cart.length} product{cart.length === 1 ? "" : "s"}</span></div>
          {cart.length === 0 ? <p className="empty-state">Add products above to start an order.</p> : <>
            <div className="cart-list">{cart.map((item) => <div className="cart-row" key={item.product._id}>
              <div><strong>{item.product.name}</strong><span className="product-id">${item.product.price.toFixed(2)} each</span></div>
              <input aria-label={`Quantity for ${item.product.name}`} className="quantity-input" type="number" min="1" max={item.product.available} value={item.qty} onChange={(event) => updateCartQuantity(item.product._id, Number(event.target.value))} />
              <strong>${(item.product.price * item.qty).toFixed(2)}</strong>
            </div>)}</div>
            <div className="cart-footer"><strong>Total ${cart.reduce((sum, item) => sum + item.product.price * item.qty, 0).toFixed(2)}</strong><button className="button-primary" onClick={createOrder} disabled={creatingOrder}>{creatingOrder ? "Creating..." : "Create order"}</button></div>
            {orderMessage && <p className="form-error">{orderMessage}</p>}
          </>}
        </section>
      </main>
    </div>
  );
}