// Venmo payment links (https://venmo.com/<username>?txn=pay&amount=…&note=…).
// Opening the link only pre-fills a payment in Venmo; it never confirms anything.
// The shop verifies each payment in the admin dashboard before an order is marked paid.

export const isPlaceholder = (username: string) => !username || /^@?VENMO_USERNAME$/i.test(username.trim());
export const cleanHandle = (username: string) => username.trim().replace(/^@/, "");

export function venmoUrl(username: string, amountCents: number, note: string, override?: string | null): string {
  if (override && /^https:\/\/(www\.)?(venmo\.com|account\.venmo\.com)\//i.test(override.trim())) {
    const u = new URL(override.trim());
    if (!u.searchParams.has("txn")) u.searchParams.set("txn", "pay");
    u.searchParams.set("amount", (amountCents / 100).toFixed(2));
    u.searchParams.set("note", note);
    return u.toString();
  }
  const q = new URLSearchParams({ txn: "pay", amount: (amountCents / 100).toFixed(2), note });
  return `https://venmo.com/${encodeURIComponent(cleanHandle(username))}?${q.toString()}`;
}

export const paymentNote = (orderNumber: string) => `Marshmallow Knitwear order ${orderNumber}`;
