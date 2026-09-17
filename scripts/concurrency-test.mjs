const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const concurrency = Number(process.env.CONCURRENCY || 10);

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function main() {
  console.log(`Concurrency test target: ${BASE_URL}`);
  console.log(`Concurrent checkout requests: ${concurrency}`);

  const productResult = await request("/api/products", {
    method: "POST",
    body: JSON.stringify({
      name: `Concurrency test ${Date.now()}`,
      price: 1,
      stock: 1,
    }),
  });

  if (productResult.response.status !== 201) {
    throw new Error(`Product creation failed (${productResult.response.status}): ${JSON.stringify(productResult.body)}`);
  }

  const productId = productResult.body._id;
  const orderResults = await Promise.all(
    Array.from({ length: concurrency }, () =>
      request("/api/orders", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId, qty: 1 }] }),
      })
    )
  );

  const createdOrders = orderResults
    .filter(({ response }) => response.status === 201)
    .map(({ body }) => body);

  if (createdOrders.length !== concurrency) {
    throw new Error(`Expected ${concurrency} orders, created ${createdOrders.length}`);
  }

  const checkoutResults = await Promise.all(
    createdOrders.map((order) =>
      request(`/api/orders/${order._id}/checkout`, { method: "POST" })
    )
  );

  const successful = checkoutResults.filter(({ response }) => response.status === 200);
  const conflicts = checkoutResults.filter(({ response }) => response.status === 409);
  const unexpected = checkoutResults.filter(
    ({ response }) => response.status !== 200 && response.status !== 409
  );

  console.log(`Orders created: ${createdOrders.length}`);
  console.log(`Checkout successes: ${successful.length}`);
  console.log(`Stock conflicts (409): ${conflicts.length}`);
  console.log(`Unexpected responses: ${unexpected.length}`);
  console.log(`Expected result: 1 success, ${concurrency - 1} conflicts`);

  await request(`/api/products/${productId}`, { method: "DELETE" });

  if (successful.length !== 1 || conflicts.length !== concurrency - 1 || unexpected.length !== 0) {
    throw new Error("Concurrency invariant failed");
  }

  console.log("PASS: only one checkout reserved the single available unit.");
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
