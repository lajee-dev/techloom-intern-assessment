# Ledger POS Inventory

A Next.js POS inventory app with MongoDB, Cloudinary product images, product orders, stock reservations, checkout, and payment simulation.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` with:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/pos_inventory
CRON_SECRET=replace-with-a-random-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

For local development without a replica-set MongoDB, the app uses a transaction-capable in-memory MongoDB fallback. Production must use MongoDB Atlas or another replica-set deployment because checkout and payment use transactions.

## Verification

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push the `main` branch to GitHub.
2. Import the repository into Vercel.
3. Add these Production environment variables in Vercel Project Settings:
   - `MONGODB_URI`
   - `CRON_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Use a MongoDB Atlas URI and allow Vercel access in Atlas Network Access.
5. Redeploy after saving the variables.

The Cloudinary API secret must only exist in server environment variables. Never commit `.env.local`.

## Available routes

- `/` product catalog, image upload, cart, and order creation
- `/products/:id` product detail with image
- `/orders` checkout, payment, and cancellation workflow
- `/api/health` database health check
