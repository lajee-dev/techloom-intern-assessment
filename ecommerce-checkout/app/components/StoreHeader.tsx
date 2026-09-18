import Link from "next/link";

export default function StoreHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">ecommerce-checkout</Link>
      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/">Shop</Link>
        <Link href="/cart">Cart</Link>
        <Link href="/orders">Orders</Link>
      </nav>
    </header>
  );
}
