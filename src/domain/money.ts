/**
 * Round a money amount to whole cents, half away from zero. Rounding `amount * 100` directly is
 * wrong for values like 19.995, whose float product is 1999.4999999999998; trimming the product
 * to 6 decimals first removes that representation noise.
 */
export function roundToCents(amount: number): number {
  return Math.round(Number((amount * 100).toFixed(6))) / 100;
}
