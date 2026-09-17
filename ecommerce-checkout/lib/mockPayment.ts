import { randomUUID } from "node:crypto";

export type MockPaymentStatus = "succeeded" | "failed";

export interface MockPaymentResult {
  id: string;
  amount: number;
  status: MockPaymentStatus;
}

function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
}

export async function processPayment(amount: number): Promise<MockPaymentResult> {
  validateAmount(amount);

  return {
    id: `pay_${randomUUID()}`,
    amount,
    status: "succeeded",
  };
}

export async function refundPayment(
  paymentId: string,
  amount: number
): Promise<MockPaymentResult> {
  if (!paymentId.trim()) {
    throw new Error("Payment ID is required");
  }

  validateAmount(amount);

  return {
    id: `ref_${randomUUID()}`,
    amount,
    status: "succeeded",
  };
}