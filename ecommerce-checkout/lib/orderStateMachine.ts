export const ORDER_STATUSES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "failed", "cancelled"],
  paid: ["refunded"],
  failed: [],
  cancelled: [],
  refunded: [],
};

export function canTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
) {
  return transitions[currentStatus].includes(nextStatus);
}

export function transitionOrder(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): OrderStatus {
  if (!canTransition(currentStatus, nextStatus)) {
    throw new Error(`Invalid order transition: ${currentStatus} -> ${nextStatus}`);
  }

  return nextStatus;
}

export function getAllowedTransitions(status: OrderStatus) {
  return transitions[status];
}