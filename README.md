# Techloom Intern Assessment

This repository also contains the `ecommerce-checkout` application. Each app has its own Next.js project and dependencies.

## Ecommerce Checkout

**Live deployment:** https://ecommerce-checkout-jet.vercel.app/

```bash
cd ecommerce-checkout
npm install
npm run dev
```

Configure `ecommerce-checkout/.env.local` with a valid `MONGODB_URI`. To populate the product catalog, run:

```bash
npm run seed:products
```

The checkout app includes the storefront, cookie-based cart, stock reservation, mock payment, order history, refunds, and expired-order cleanup routes.

### Checkout UI

- `/`: storefront grid with search, category, price, and stock filters
- `/products/[id]`: product details and add to cart
- `/cart`: cart management and checkout navigation
- `/checkout`: stock reservation and mock payment
- `/orders`: order history, cancellation, and refund actions

### Checkout API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/products` | Search and filter products |
| `GET` | `/api/products/[id]` | Product details |
| `GET/POST/PATCH/DELETE` | `/api/cart` | Cookie-backed cart management |
| `GET/POST` | `/api/orders` | Order history and order creation |
| `POST` | `/api/orders/[id]/checkout` | Validate the reservation |
| `POST` | `/api/orders/[id]/pay` | Complete mock payment |
| `POST` | `/api/orders/[id]/cancel` | Cancel and release stock |
| `POST` | `/api/orders/[id]/refund` | Record a mock refund |
| `GET` | `/api/cron/release-expired` | Release expired reservations |

### Checkout behavior

Reservations use conditional MongoDB updates to prevent overselling. Pending orders expire after 15 minutes, and cancellation or expiry releases reserved stock. Authentication is substituted with an `httpOnly` `checkout_user_id` UUID cookie.

Run checkout verification from its project directory:

```bash
cd ecommerce-checkout
npm run test
npm run lint
npm run build
```

Production catalog data is defined in `ecommerce-checkout/data/products.json` and seeded with:

```bash
npm run seed:products
```

## POS Inventory

The POS inventory application is a separate Next.js project from `ecommerce-checkout`.

**Live deployment:** https://pos-inventory-phi.vercel.app/
**Repository:** https://github.com/lajee-dev/techloom-intern-assessment

### Tech stack

Next.js 16, TypeScript, MongoDB Atlas, Mongoose, Cloudinary, and Vercel.

### Setup

```bash
git clone https://github.com/lajee-dev/techloom-intern-assessment.git
cd techloom-intern-assessment/pos-inventory
npm install
npm run dev
```

Create `pos-inventory/.env.local` with these variable names:

```env
MONGODB_URI=your-mongodb-atlas-connection-string
CRON_SECRET=your-random-cron-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Never commit `.env.local` or put secret values in this README.

### Feature testing

### Product CRUD

Use the Products UI to add, view, edit, and delete products. The API is available at `GET`, `POST`, `PUT`, and `DELETE /api/products` and `/api/products/:id`.

### Stock reservation

Create an order from the Products cart, open Orders, and click **Checkout**. The order becomes `RESERVED` and the product's `available` value drops by the reserved quantity.

### Expiry

Checkout an order and leave it unpaid for five minutes. The reservation expires and stock returns. For an immediate check, call the protected route:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-DEPLOYMENT-URL/api/cron/release-expired
```

The Orders read path also performs a lazy expiry sweep. This is the correctness guarantee because Vercel Hobby cron jobs cannot be relied on for exact five-minute execution.

### Payment outcomes

On an order with `RESERVED` status, use **Pay** for success or the failure/timeout controls. Success changes the order to `PAID` and decreases stock. Failure or timeout releases the reservation and changes the order to `FAILED`.

### Duplicate payment rejection

Call `/api/orders/:id/pay` twice with the same `idempotencyKey`. The first valid payment is processed; the second attempt is rejected with a conflict because the order has already transitioned.

### Cancellation

Cancel a `RESERVED` order to release its reservation. Cancel a `PAID` order to restore the purchased stock.

## Concurrency test

The script creates one product with one available unit, creates concurrent orders, and checks out all orders at the same time. The expected invariant is exactly one successful checkout and all remaining requests returning `409`.

Run locally against port 3000:

```bash
node scripts/concurrency-test.mjs
```

Run against Vercel:

```bash
BASE_URL=https://YOUR-DEPLOYMENT-URL node scripts/concurrency-test.mjs
```

### Local output

```text
Concurrency test target: http://localhost:3000
Concurrent checkout requests: 10
Orders created: 10
Checkout successes: 1
Stock conflicts (409): 9
Unexpected responses: 0
Expected result: 1 success, 9 conflicts
PASS: only one checkout reserved the single available unit.
```

### Vercel output

```text
Concurrency test target: https://pos-inventory-phi.vercel.app
Concurrent checkout requests: 10
Orders created: 10
Checkout successes: 1
Stock conflicts (409): 9
Unexpected responses: 0
Expected result: 1 success, 9 conflicts
PASS: only one checkout reserved the single available unit.
```

The live health check also returned `200` with `{"status":"connected"}`.

To repeat the test:

```bash
BASE_URL=https://pos-inventory-phi.vercel.app node scripts/concurrency-test.mjs
```

### Verification

```bash
npm run lint
npm run build
```

### Deploy

1. Push `main` to GitHub.
2. Import the repository into Vercel.
3. Set `MONGODB_URI`, `CRON_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Vercel Project Settings for Production.
4. Use MongoDB Atlas with network access configured for Vercel.
5. Replace the deployment placeholder at the top of this README with the deployed Vercel URL.
