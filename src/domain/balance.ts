/**
 * Payment and balance arithmetic, in integer cents (see domain/money). Screens, reports and the
 * overpayment check all use these, so they always agree.
 */
import type { PaymentMethod } from '../schemas/PaymentSchema';
import type { ReservationStatus } from '../schemas/ReservationSchema';

interface PaymentAmount {
  reservationId: string;
  amountCents: number;
}

export interface ReservationBalance {
  /** The reservation price. */
  totalCents: number;
  paidCents: number;
  /** What is still owed; zero when fully paid. */
  balanceCents: number;
}

export function sumCents(amounts: Iterable<number>): number {
  let sum = 0;
  for (const cents of amounts) sum += cents;
  return sum;
}

/** Paid and remaining amounts for a reservation, given the payments made for it. */
export function reservationBalance(priceCents: number, payments: readonly PaymentAmount[]): ReservationBalance {
  const paidCents = sumCents(payments.map(payment => payment.amountCents));
  return { totalCents: priceCents, paidCents, balanceCents: priceCents - paidCents };
}

export function groupPaymentsByReservation<T extends PaymentAmount>(payments: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const payment of payments) {
    const existing = grouped.get(payment.reservationId);
    if (existing) existing.push(payment);
    else grouped.set(payment.reservationId, [payment]);
  }
  return grouped;
}

/** Total collected per payment method; methods without payments are zero. */
export function totalsByMethod(payments: readonly (PaymentAmount & { method: PaymentMethod })[]): Record<PaymentMethod, number> {
  const totals: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };
  for (const payment of payments) totals[payment.method] += payment.amountCents;
  return totals;
}

/** Reservations that still owe money (cancelled ones excluded), largest balance first. */
export function outstandingBalances<R extends { id: string; priceCents: number; status: ReservationStatus }>(
  reservations: readonly R[],
  payments: readonly PaymentAmount[],
): (ReservationBalance & { reservation: R })[] {
  const paymentsByReservation = groupPaymentsByReservation(payments);
  return reservations
    .filter(reservation => reservation.status !== 'Cancelled')
    .map(reservation => ({ reservation, ...reservationBalance(reservation.priceCents, paymentsByReservation.get(reservation.id) ?? []) }))
    .filter(item => item.balanceCents > 0)
    .sort((a, b) => b.balanceCents - a.balanceCents);
}
