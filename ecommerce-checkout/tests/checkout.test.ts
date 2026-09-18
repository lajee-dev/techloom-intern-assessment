import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canTransition, transitionOrder } from "../lib/orderStateMachine";
import { processPayment, refundPayment } from "../lib/mockPayment";

describe("order state machine", () => {
  it("allows cancellation and refund from the supported states", () => {
    assert.equal(canTransition("pending", "cancelled"), true);
    assert.equal(canTransition("cancelled", "refunded"), true);
    assert.equal(canTransition("paid", "refunded"), true);
    assert.equal(transitionOrder("paid", "refunded"), "refunded");
  });

  it("rejects invalid transitions", () => {
    assert.equal(canTransition("refunded", "paid"), false);
    assert.throws(() => transitionOrder("refunded", "paid"), /Invalid order transition/);
  });
});

describe("mock payments", () => {
  it("returns successful payment and refund records", async () => {
    const payment = await processPayment(42);
    const refund = await refundPayment(payment.id, 42);

    assert.equal(payment.status, "succeeded");
    assert.match(payment.id, /^pay_/);
    assert.equal(refund.status, "succeeded");
    assert.match(refund.id, /^ref_/);
  });

  it("rejects invalid amounts and missing payment IDs", async () => {
    await assert.rejects(() => processPayment(0), /greater than zero/);
    await assert.rejects(() => refundPayment("", 10), /Payment ID is required/);
  });
});