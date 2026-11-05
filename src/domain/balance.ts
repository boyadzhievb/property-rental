/**
 * Money arithmetic for payments and balances. Every total goes through here so rounding happens
 * in one place: screens, reports and the overpayment check all see the same numbers.
 */
import { roundToCents } from './money';
import type { PaymentMethod } from '../schemas/PaymentSchema';
import type { ReservationStatus } from '../schemas/ReservationSchema';

interface PaymentAmount {
  reservationId: string;
  amount: number;
}

export interface ReservationBalance {
  /** The reservation price. */
  total: number;
  paid: number;
  /** What is still owed; zero when fully paid. */
  balance: number;
}

/** Sum money amounts, rounded to cents so float noise never reaches the screen. */
export function sumMoney(amounts: Iterable<number>): number {
  let sum = 0;
  for (const amount of amounts) sum += amount;
  return roundToCents(sum);
}

/** Paid and remaining amounts for a reservation, given the payments made for it. */
export function reservationBalance(price: number, payments: readonly PaymentAmount[]): ReservationBalance {
  const paid = sumMoney(payments.map(payment => payment.amount));
  return { total: price, paid, balance: roundToCents(price - paid) };
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
  const amountsByMethod: Record<PaymentMethod, number[]> = { cash: [], card: [], transfer: [] };
  for (const payment of payments) amountsByMethod[payment.method].push(payment.amount);
  return {
    cash: sumMoney(amountsByMethod.cash),
    card: sumMoney(amountsByMethod.card),
    transfer: sumMoney(amountsByMethod.transfer),
  };
}

/** Reservations that still owe money (cancelled ones excluded), largest balance first. */
export function outstandingBalances<R extends { id: string; price: number; status: ReservationStatus }>(
  reservations: readonly R[],
  payments: readonly PaymentAmount[],
): (ReservationBalance & { reservation: R })[] {
  const paymentsByReservation = groupPaymentsByReservation(payments);
  return reservations
    .filter(reservation => reservation.status !== 'Cancelled')
    .map(reservation => ({ reservation, ...reservationBalance(reservation.price, paymentsByReservation.get(reservation.id) ?? []) }))
    .filter(item => item.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}
