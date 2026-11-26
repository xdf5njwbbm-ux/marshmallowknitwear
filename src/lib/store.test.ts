// node --experimental-strip-types src/lib/store.test.ts
import assert from "node:assert/strict";
import { addLine, changeLine, isAvailable, removeLine, setQty, shippingFor, totals } from "./cart.ts";
import { venmoUrl, isPlaceholder, paymentNote } from "./venmo.ts";
import type { Product } from "./types.ts";

const P = (id: string, price: number, extra: Partial<Product> = {}): Product => ({
  id, slug: id, name: id, subtitle: "", description: "", price_cents: price, compare_at_cents: null, audience: "women", badge: null,
  sizes: ["S", "M", "L"], materials: "", care: "", details: [], processing_time: null, featured: false, sold_out: false, active: true, sort: 0,
  created_at: "", categories: [], colors: [{ name: "Cream", hex: "#fff", sort: 0 }, { name: "Blush", hex: "#f00", sort: 1 }], images: [],
  variants: [{ size: "L", color: "Blush", sold_out: true, price_cents: null }, { size: "S", color: "Cream", sold_out: false, price_cents: 9000 }], ...extra,
});
const ship = { shipping_flat_cents: 900, free_shipping_over_cents: 15000 };
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; void name; };

t("adding the same choice twice merges and caps at 10", () => {
  let c = addLine([], { product_id: "a", slug: "a", size: "M", color: "Cream", quantity: 2 });
  c = addLine(c, { product_id: "a", slug: "a", size: "M", color: "Cream", quantity: 9 });
  assert.equal(c.length, 1);
  assert.equal(c[0].quantity, 10);
  c = addLine(c, { product_id: "a", slug: "a", size: "L", color: "Cream", quantity: 1 });
  assert.equal(c.length, 2);
});

t("quantity, change size/colour (merging), remove", () => {
  let c = addLine([], { product_id: "a", slug: "a", size: "M", color: "Cream", quantity: 1 });
  c = addLine(c, { product_id: "a", slug: "a", size: "L", color: "Cream", quantity: 2 });
  c = changeLine(c, c[0].key, { size: "L" });
  assert.equal(c.length, 1);
  assert.equal(c[0].quantity, 3);
  c = changeLine(c, c[0].key, { color: "Blush" });
  assert.equal(c[0].key, "a|L|Blush");
  c = setQty(c, c[0].key, 0);
  assert.equal(c.length, 0);
  c = addLine([], { product_id: "a", slug: "a", size: "M", color: "Cream", quantity: 1 });
  assert.equal(removeLine(c, c[0].key).length, 0);
});

t("totals use database prices, variant prices and free shipping", () => {
  const products = [P("a", 10000), P("b", 6000)];
  let c = addLine([], { product_id: "a", slug: "a", size: "M", color: "Cream", quantity: 1 });
  assert.deepEqual(totals(c, products, ship), { subtotal: 10000, shipping: 900, total: 10900, count: 1, problems: [] });
  c = addLine(c, { product_id: "b", slug: "b", size: "S", color: "Cream", quantity: 1 });
  const r = totals(c, products, ship);
  assert.equal(r.subtotal, 19000);
  assert.equal(r.shipping, 0);
  assert.equal(shippingFor(0, ship), 0);
  assert.equal(shippingFor(5000, { shipping_flat_cents: 900, free_shipping_over_cents: null }), 900);
});

t("sold-out combinations and removed products are flagged", () => {
  const products = [P("a", 10000), P("x", 5000, { sold_out: true })];
  assert.equal(isAvailable(products[0], "L", "Blush"), false);
  assert.equal(isAvailable(products[0], "XL", "Cream"), false);
  assert.equal(isAvailable(products[0], "M", "Blush"), true);
  let c = addLine([], { product_id: "a", slug: "a", size: "L", color: "Blush", quantity: 1 });
  c = addLine(c, { product_id: "gone", slug: "gone", size: "M", color: "Cream", quantity: 1 });
  c = addLine(c, { product_id: "x", slug: "x", size: "M", color: "Cream", quantity: 1 });
  assert.equal(totals(c, products, ship).problems.length, 3);
});

t("Venmo link carries amount and the order number, never anything secret", () => {
  const u = new URL(venmoUrl("@cozyknits", 28600, paymentNote("MK-ABC123")));
  assert.equal(u.origin + u.pathname, "https://venmo.com/cozyknits");
  assert.equal(u.searchParams.get("txn"), "pay");
  assert.equal(u.searchParams.get("amount"), "286.00");
  assert.match(u.searchParams.get("note")!, /MK-ABC123/);
  assert.ok(isPlaceholder("@VENMO_USERNAME") && isPlaceholder("VENMO_USERNAME") && !isPlaceholder("cozyknits"));
  const o = new URL(venmoUrl("x", 1000, "n", "https://venmo.com/u/shop-name"));
  assert.equal(o.pathname, "/u/shop-name");
  assert.equal(o.searchParams.get("amount"), "10.00");
  assert.ok(venmoUrl("x", 1000, "n", "javascript:alert(1)").startsWith("https://venmo.com/x"));
});

console.log(`${n} store tests passed`);
