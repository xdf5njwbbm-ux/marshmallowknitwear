import { Link } from "react-router-dom";
import { ArrowRight, Package } from "lucide-react";
import type { Order } from "../lib/types";
import { date, moneyExact, STATUS } from "../lib/format";
import { useMeta } from "../lib/seo";
import { TrackForm } from "./Track";

type Saved = { number: string; token: string; total_cents: number; created_at: string; status: Order["status"] };
const KEY = "mk-orders";

/** Orders placed on this device (so customers can come back to the payment page). */
export function recentOrders(): Saved[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
export function rememberOrder(o: Order) {
  const list = recentOrders().filter((x) => x.number !== o.number);
  list.unshift({ number: o.number, token: o.token, total_cents: o.total_cents, created_at: o.created_at, status: o.status });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export default function Account() {
  useMeta({ title: "Your orders", noindex: true });
  const list = recentOrders();
  return (
    <div className="wrap grid gap-10 py-14 lg:grid-cols-[1fr_420px] lg:py-20">
      <div>
        <div className="eyebrow">Account</div>
        <h1 className="mt-3 text-[40px] sm:text-[52px]">Your orders</h1>
        <p className="mt-3 max-w-lg text-[16px] text-choc-soft">You don't need an account to shop with us. Orders placed on this device appear below, and you can look up any order with its number and your email.</p>
        <div className="mt-8">
          {list.length ? (
            <ul className="grid gap-3">
              {list.map((o) => (
                <li key={o.number}>
                  <Link to={`/order/${o.number}?t=${o.token}`} className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
                    <span className="grid size-11 place-items-center rounded-full bg-oat"><Package size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono font-bold">{o.number}</span>
                      <span className="block text-[13.5px] text-choc-soft">{date(o.created_at)} · {moneyExact(o.total_cents)} · {STATUS[o.status]?.short}</span>
                    </span>
                    <ArrowRight size={18} className="text-choc-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[var(--radius-soft)] border border-dashed border-sand p-8 text-center text-choc-soft">No orders on this device yet. <Link to="/shop" className="underline">Start shopping</Link></div>
          )}
        </div>
      </div>
      <div className="card h-fit p-6 sm:p-8">
        <h2 className="text-2xl">Look up an order</h2>
        <div className="mt-5"><TrackForm /></div>
      </div>
    </div>
  );
}
