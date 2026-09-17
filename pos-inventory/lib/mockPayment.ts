// lib/mockPayment.ts

export type PaymentOutcome = "success" | "failure" | "timeout";

export interface PaymentResult {
  status: PaymentOutcome;
  processedAt: Date;
  message: string;
}

/**
 * Simulates a payment gateway call.
 *
 * The outcome is passed in explicitly (by the client, or a test script)
 * rather than randomized — this makes every branch reproducible on
 * demand, which matters for a reviewer verifying success/failure/timeout
 * handling without relying on chance.
 */
export function simulatePayment(outcome: PaymentOutcome): PaymentResult {
  const messages: Record<PaymentOutcome, string> = {
    success: "Payment authorized and captured.",
    failure: "Payment declined by gateway.",
    timeout: "Payment gateway did not respond in time.",
  };

  return {
    status: outcome,
    processedAt: new Date(),
    message: messages[outcome],
  };
}