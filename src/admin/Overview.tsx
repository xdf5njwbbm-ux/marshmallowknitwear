import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, BadgeCheck, Hammer, Inbox, MessageSquareText, Star, Wallet } from "lucide-react";
import { date, moneyExact } from "../lib/format";
import { isPlaceholder } from "../lib/venmo";
import { StatusPill } from "../components/OrderView";
import { admin, customerSaysPaid } from "./data";
import { Loading, PageTitle, useLoad } from "./kit";

export default function Overview() {
  const { data, error } = useLoad(() =>
    Promise.all([admin.orders(), admin.requests(), admin.messages(), admin.reviews(), admin.settings(), admin.products()]).then(([orders, requests, messages, reviews, settings, products]) => ({
      orders, requests, messages, reviews, settings, products,
    })),
  );
  if (!data) return <Loading error={error} />;
  const { orders, requests, messages, reviews, settings, products } = data;
  const live = orders.filter((o) => o.status !== "cancelled");
  const awaiting = live.filter((o) => o.payment_status === "awaiting");
  const claimed = awaiting.filter(customerSaysPaid);
  const toMake = live.filter((o) => ["payment_confirmed", "preparing", "production"].includes(o.status));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const paidMonth = live.filter((o) => o.payment_status === "verified" && (o.paid_at ?? "") >= monthStart).reduce((s, o) => s + o.total_cents, 0);
  const paidAll = live.filter((o) => o.payment_status === "verified").reduce((s, o) => s + o.total_cents, 0);
  const tiles = [
    { to: "/admin/orders?tab=awaiting", label: "Awaiting payment", value: awaiting.length, sub: claimed.length ? `${claimed.length} say they've paid` : "Check Venmo for these", icon: Wallet, tone: "bg-butter" },
    { to: "/admin/orders?tab=make", label: "To make & ship", value: toMake.length, sub: "Paid orders in progress", icon: Hammer, tone: "bg-sky" },
    { to: "/admin/orders?tab=all", label: "Verified this month", value: moneyExact(paidMonth), sub: `${moneyExact(paidAll)} all time`, icon: BadgeCheck, tone: "bg-sage" },
    { to: "/admin/requests", label: "New custom requests", value: requests.filter((r) => r.status === "new").length, sub: `${requests.length} total`, icon: Inbox, tone: "bg-blush" },
    { to: "/admin/messages", label: "Unread messages", value: messages.filter((m) => !m.handled).length, sub: `${messages.length} total`, icon: MessageSquareText, tone: "bg-lilac" },
    { to: "/admin/reviews", label: "Reviews to approve", value: reviews.filter((r) => !r.approved).length, sub: `${reviews.filter((r) => r.approved && !r.is_sample).length} real reviews live`, icon: Star, tone: "bg-oat" },
  ];
  const setup = [
    isPlaceholder(settings.venmo_username) && { text: "Add your Venmo username so customers can pay.", to: "/admin/settings" },
    !settings.venmo_logo_url && { text: "Optional: upload the official Venmo logo for the payment screen.", to: "/admin/settings" },
    products.some((p) => p.images.some((i) => i.url.includes("images.unsplash.com"))) && { text: "Replace the placeholder stock photos with photos of your own cardigans.", to: "/admin/products" },
    reviews.some((r) => r.is_sample && r.approved) && { text: "Sample reviews are showing (clearly labelled). Hide them once real reviews come in.", to: "/admin/reviews" },
  ].filter(Boolean) as { text: string; to: string }[];

  return (
    <>
      <PageTitle title="Overview" />
      {setup.length > 0 && (
        <section className="mb-6 rounded-[var(--radius-soft)] border border-butter bg-butter/50 p-5">
          <h2 className="flex items-center gap-2 font-sans text-[15px] font-bold"><AlertTriangle size={18} /> Finish setting up your store</h2>
          <ul className="mt-3 grid gap-2 text-[14.5px]">
            {setup.map((s) => <li key={s.text}><Link to={s.to} className="flex items-center justify-between gap-3 rounded-xl bg-paper/80 px-4 py-3 hover:bg-paper">{s.text} <ArrowRight size={16} className="shrink-0" /></Link></li>)}
          </ul>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map(({ to, label, value, sub, icon: Icon, tone }) => (
          <Link key={label} to={to} className="card p-4 transition hover:shadow-lift sm:p-5">
            <span className={`grid size-10 place-items-center rounded-full ${tone}`}><Icon size={19} /></span>
            <div className="mt-3 font-display text-[28px] leading-none">{value}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold">{label}</div>
            <div className="text-[12.5px] text-choc-soft">{sub}</div>
          </Link>
        ))}
      </div>
      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Latest orders</h2>
          <Link to="/admin/orders" className="btn-link">All orders</Link>
        </div>
        {orders.length ? (
          <ul className="mt-3 divide-y divide-beige">
            {orders.slice(0, 8).map((o) => (
              <li key={o.id}>
                <Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-oat/40">
                  <span className="font-mono font-bold">{o.number}</span>
                  <span className="min-w-0 flex-1 truncate text-[14.5px]">{o.name}</span>
                  <span className="text-[14px] text-choc-soft">{date(o.created_at)}</span>
                  <span className="font-semibold">{moneyExact(o.total_cents)}</span>
                  <StatusPill status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14.5px] text-choc-soft">No orders yet. They'll appear here as soon as a customer checks out.</p>
        )}
      </section>
    </>
  );
}
