/**
 * money.ts — the only place prices are turned into text.
 *
 * Every product is priced and charged in TND. Flouci settles in TND (millimes),
 * so there is no conversion anywhere in the app: the database price is the
 * amount the customer pays and the amount that lands in the wallet.
 */

/** Format a TND amount for display, e.g. 29.5 -> "29.5 TND". */
export function formatTnd(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;

  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

  return `${formatted} TND`;
}
