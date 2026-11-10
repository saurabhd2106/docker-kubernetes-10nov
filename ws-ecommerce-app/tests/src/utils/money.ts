/** Format cents as USD the same way the storefront does (`formatMoney`). */
export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
