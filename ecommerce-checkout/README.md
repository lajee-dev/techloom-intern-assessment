# Ecommerce Checkout

A Next.js checkout application for a small product catalog. It includes a storefront, cookie-backed cart, atomic stock reservations, mock payments, order history, refunds, and expired-order cleanup.

**Live deployment:** https://ecommerce-checkout-jet.vercel.app/

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Create `.env.local` with:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

MongoDB Atlas must allow the deployment or local machine IP address. The application uses an in-memory MongoDB server automatically in non-production environments when no external URI is available.

## Storefront

- `/`: product grid with search, category, price, and stock filters
- `/products/[id]`: product detail and add-to-cart
- `/cart`: cart quantities, item removal, totals, and checkout navigation
- `/checkout`: stock reservation and mock payment
- `/orders`: order history with cancellation and refund actions

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/products` | Search and filter products |
| `GET` | `/api/products/[id]` | Fetch product details |
| `GET` | `/api/cart` | Read the current cookie-backed cart |
| `POST` | `/api/cart` | Add an item to the cart |
| `PATCH` | `/api/cart` | Change an item quantity |
| `DELETE` | `/api/cart` | Remove an item |
| `POST` | `/api/orders` | Create an order and reserve stock |
| `GET` | `/api/orders` | Read order history for the current user |
| `POST` | `/api/orders/[id]/checkout` | Refresh and validate an order reservation |
| `POST` | `/api/orders/[id]/pay` | Complete a mock payment |
| `POST` | `/api/orders/[id]/cancel` | Cancel an order and release stock |
| `POST` | `/api/orders/[id]/refund` | Record a mock refund |
| `GET` | `/api/cron/release-expired` | Release expired pending reservations |

## Checkout behavior

Stock reservation uses conditional MongoDB updates, so concurrent requests cannot reserve more than the available quantity. Pending orders expire after 15 minutes. Cancellation and expiration release reserved stock. The payment provider is intentionally mocked.

There is no real authentication. The first API request creates a UUID in the `httpOnly` `checkout_user_id` cookie. That value is used as `userId` when creating and reading orders.

## Product data

Development products are defined in `data/products.json`. Seed them into a production MongoDB database with:

```bash
npm run seed:products
```

The seed is idempotent and only inserts products that do not already exist by name. Production does not auto-seed catalog data.

## Verification

```bash
npm run test
npm run lint
npm run build
```

The test suite covers order state transitions and mock payment/refund validation.
