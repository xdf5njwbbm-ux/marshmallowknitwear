import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Hourglass, Mail, Printer } from "lucide-react";
import { api } from "../lib/api";
import { friendly } from "../lib/supabase";
import type { Order } from "../lib/types";
import { date, STATUS } from "../lib/format";
import { useMeta } from "../lib/seo";
import Layout from "../components/Layout";
import { Marshmallow } from "../components/Brand";
import { OrderDetails, StatusPill, Timeline, VenmoPayment } from "../components/OrderView";
import { Spinner } from "../components/ui";
import { CheckoutShell } from "./Checkout";
import { recentOrders, rememberOrder } from "./Account";
import { TrackForm } from "./Track";

export default function OrderPage() {
  const { number = "" } = useParams();
  const [q] = useSearchParams();
  const token = q.get("t") ?? recentOrders().find((o) => o.number === number.toUpperCase())?.token ?? "";
  const fresh = q.get("new") === "1";
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useMeta({ title: `Order ${number.toUpperCase()}`, noindex: true });

  useEffect(() => {
    if (!token) return setOrder(null);
    api.getOrder(number, token).then((o) => {
      setOrder(o);
      if (o) rememberOrder(o);
    }).catch((e) => setError(friendly(e)));
  }, [number, token]);

  // keep an eye on payment confirmation while the page is open
  useEffect(() => {
    if (!order || order.payment_status !== "awaiting" || order.status === "cancelled") return;
    const t = setInterval(() => api.getOrder(order.number, order.token).then((o) => o && setOrder(o)).catch(() => {}), 30_000);
    return () => clearInterval(t);
  }, [order?.number, order?.payment_status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (order === undefined && !error) {
    return <Layout><div className="grid min-h-[50vh] place-items-center"><Spinner className="size-8 text-cocoa" /></div></Layout>;
  }
  if (!order) {
    return (
      <Layout>
        <div className="wrap max-w-xl py-16">
          <h1 className="text-[36px]">Find your order</h1>
          <p className="mt-2 text-choc-soft">{error ?? "Enter your order number and the email you used at checkout."}</p>
          <div className="mt-6"><TrackForm initialNumber={number} /></div>
        </div>
      </Layout>
    );
  }

  const awaiting = order.payment_status === "awaiting" && order.status !== "cancelled";
  const body = (
    <div className="wrap max-w-5xl py-8 sm:py-12">
      {fresh && (
        <div className="mb-8 flex items-start gap-4 rounded-[var(--radius-soft)] bg-sage/50 p-5 sm:p-6">
          <CheckCircle2 size={26} className="mt-0.5 shrink-0 text-sage-deep" />
          <div>
            <h1 className="text-[26px] leading-tight sm:text-[30px]">Thank you, {order.name.split(" ")[0]}! Your order is placed.</h1>
            <p className="mt-1 text-[15px] text-choc/80">Your order number is <b className="font-mono">{order.number}</b>. Save it — you'll need it in your Venmo note and to track your order.</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Order {order.number}</div>
          {!fresh && <h1 className="mt-2 text-[34px] sm:text-[42px]">{STATUS[order.status].label}</h1>}
          <p className="mt-1 text-[14px] text-choc-soft">Placed {date(order.created_at, true)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={order.status} />
          <button onClick={() => print()} className="grid size-10 place-items-center rounded-full border border-sand bg-paper hover:border-choc print:hidden" aria-label="Print"><Printer size={17} /></button>
        </div>
      </div>

      {awaiting && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-butter bg-butter/60 p-4 text-[15px]" role="status">
          <Hourglass size={20} className="mt-0.5 shrink-0 text-caramel" />
          <span><b>Your order has been received and is awaiting payment confirmation.</b> Pay with Venmo below — we'll confirm your payment and start knitting.</span>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-8">
          {awaiting && <VenmoPayment order={order} onUpdate={setOrder} />}
          <OrderDetails order={order} />
        </div>
        <aside className="grid h-fit gap-6">
          <section className="card p-6">
            <h2 className="text-2xl">Order status</h2>
            <div className="mt-5"><Timeline order={order} /></div>
          </section>
          <section className="card p-6 text-[14.5px]">
            <Mail size={20} className="text-cocoa" />
            <p className="mt-3">We'll contact you at <b>{order.email}</b> about your order. You can come back to this page any time from <Link to="/track" className="underline">Track your order</Link> with your order number and email.</p>
          </section>
          <div className="flex items-center justify-center gap-3 text-[13px] text-choc-soft">
            <Marshmallow tone="blush" face className="h-9 w-9" /> Thank you for supporting handmade.
          </div>
        </aside>
      </div>
    </div>
  );
  return awaiting ? <CheckoutShell step={3}>{body}</CheckoutShell> : <Layout>{body}</Layout>;
}
