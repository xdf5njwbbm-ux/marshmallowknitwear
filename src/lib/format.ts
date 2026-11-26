import type { OrderStatus } from "./types";

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 });

export const moneyExact = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const date = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString("en-US", withTime ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : { month: "long", day: "numeric", year: "numeric" });

export const STATUS: Record<OrderStatus, { label: string; short: string; tone: string; about: string }> = {
  awaiting_payment: { label: "Awaiting Payment", short: "Awaiting payment", tone: "bg-butter text-cocoa", about: "We've received your order and are waiting to confirm your Venmo payment." },
  payment_confirmed: { label: "Payment Confirmed", short: "Paid", tone: "bg-sage text-choc", about: "Your payment is confirmed. Thank you!" },
  preparing: { label: "Preparing Your Order", short: "Preparing", tone: "bg-sky text-choc", about: "We're gathering yarn and preparing your pieces." },
  production: { label: "Handmade Production", short: "Being knitted", tone: "bg-lilac text-choc", about: "Your cardigan is being knitted by hand, stitch by stitch." },
  shipped: { label: "Shipped", short: "Shipped", tone: "bg-blush text-choc", about: "Your order is on its way." },
  delivered: { label: "Delivered", short: "Delivered", tone: "bg-sage text-choc", about: "Delivered — we hope you love it." },
  cancelled: { label: "Cancelled", short: "Cancelled", tone: "bg-oat text-choc-soft", about: "This order was cancelled." },
};
export const FLOW: OrderStatus[] = ["awaiting_payment", "payment_confirmed", "preparing", "production", "shipped", "delivered"];

export const BADGE: Record<string, { label: string; tone: string }> = {
  new: { label: "New Arrival", tone: "bg-paper/95 text-choc" },
  bestseller: { label: "Best Seller", tone: "bg-blush text-choc" },
  limited: { label: "Limited", tone: "bg-sky text-choc" },
  "one-of-a-kind": { label: "One of a Kind", tone: "bg-butter text-choc" },
};

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export const US_STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
  ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"],
  ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"], ["PR", "Puerto Rico"], ["GU", "Guam"],
  ["VI", "U.S. Virgin Islands"], ["AS", "American Samoa"], ["MP", "Northern Mariana Islands"], ["AA", "Armed Forces Americas"],
  ["AE", "Armed Forces Europe"], ["AP", "Armed Forces Pacific"],
];
