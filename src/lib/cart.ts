// Pure bag logic (no React), so it's easy to test.
import type { CartLine, Product, Settings } from "./types";

export const MAX_QTY = 10;
export const lineKey = (product_id: string, size: string, color: string) => `${product_id}|${size}|${color}`;

export function addLine(lines: CartLine[], l: Omit<CartLine, "key">): CartLine[] {
  const key = lineKey(l.product_id, l.size, l.color);
  const hit = lines.find((x) => x.key === key);
  if (hit) return lines.map((x) => (x.key === key ? { ...x, quantity: Math.min(MAX_QTY, x.quantity + l.quantity) } : x));
  return [...lines, { ...l, key, quantity: Math.min(MAX_QTY, Math.max(1, l.quantity)) }];
}

export function setQty(lines: CartLine[], key: string, q: number): CartLine[] {
  if (q < 1) return lines.filter((x) => x.key !== key);
  return lines.map((x) => (x.key === key ? { ...x, quantity: Math.min(MAX_QTY, q) } : x));
}

/** Change a line's size or colour; merges into an existing line with the same choice. */
export function changeLine(lines: CartLine[], key: string, patch: { size?: string; color?: string }): CartLine[] {
  const cur = lines.find((x) => x.key === key);
  if (!cur) return lines;
  const next = { ...cur, ...patch };
  next.key = lineKey(next.product_id, next.size, next.color);
  if (next.key === key) return lines;
  const other = lines.find((x) => x.key === next.key);
  if (other) return lines.filter((x) => x.key !== key).map((x) => (x.key === next.key ? { ...x, quantity: Math.min(MAX_QTY, x.quantity + cur.quantity) } : x));
  return lines.map((x) => (x.key === key ? next : x));
}

export const removeLine = (lines: CartLine[], key: string) => lines.filter((x) => x.key !== key);

export function unitPrice(p: Product, size: string, color: string): number {
  return p.variants.find((v) => v.size === size && v.color === color)?.price_cents ?? p.price_cents;
}

export function isAvailable(p: Product | undefined, size: string, color: string): boolean {
  if (!p || p.sold_out || !p.active) return false;
  if (!p.sizes.includes(size) || !p.colors.some((c) => c.name === color)) return false;
  return !p.variants.find((v) => v.size === size && v.color === color)?.sold_out;
}

export function shippingFor(subtotal: number, s: Pick<Settings, "shipping_flat_cents" | "free_shipping_over_cents">): number {
  if (subtotal <= 0) return 0;
  return s.free_shipping_over_cents != null && subtotal >= s.free_shipping_over_cents ? 0 : s.shipping_flat_cents;
}

export function totals(lines: CartLine[], products: Product[], s: Pick<Settings, "shipping_flat_cents" | "free_shipping_over_cents">) {
  let subtotal = 0;
  let count = 0;
  const problems: string[] = [];
  for (const l of lines) {
    const p = products.find((x) => x.id === l.product_id);
    if (!p) {
      problems.push(l.key);
      continue;
    }
    if (!isAvailable(p, l.size, l.color)) problems.push(l.key);
    subtotal += unitPrice(p, l.size, l.color) * l.quantity;
    count += l.quantity;
  }
  const shipping = shippingFor(subtotal, s);
  return { subtotal, shipping, total: subtotal + shipping, count, problems };
}
