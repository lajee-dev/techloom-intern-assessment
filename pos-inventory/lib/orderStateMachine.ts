// lib/orderStateMachine.ts
import { OrderStatus } from "@/lib/models/Order";

/**
 * Defines every valid transition an order can make.
 * Any transition not listed here is rejected.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["RESERVED", "CANCELLED"],
  RESERVED: ["PAID", "FAILED", "EXPIRED", "CANCELLED"],
  PAID: ["CANCELLED"], // post-purchase cancellation is still allowed
  CANCELLED: [], // terminal
  EXPIRED: [], // terminal
  FAILED: [], // terminal
};

/**
 * Statuses where the order still holds a stock reservation
 * (used to decide whether cancelling/expiring needs to release stock).
 */
export const RESERVING_STATUSES: OrderStatus[] = ["RESERVED"];

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Returns true if the order can move from `from` to `to`.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Throws InvalidTransitionError if the transition isn't allowed.
 * Call this before writing any status change to the DB.
 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/**
 * True if the order is in a terminal state (no further transitions possible).
 */
export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}