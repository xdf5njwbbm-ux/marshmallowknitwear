import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Ban, ExternalLink, Hourglass, Mail, Search, Truck, Undo2 } from "lucide-react";
import type { Order, OrderStatus } from "../lib/types";
import { date, money, moneyExact, STATUS } from "../lib/format";
import { friendly } from "../lib/supabase";
import { SITE_URL } from "../lib/seo";
import { cleanHandle, paymentNote } from "../lib/venmo";
import { useToast } from "../state/store";
import { CopyButton, StatusPill } from "../components/OrderView";
import { Field, Img, Spinner } from "../components/ui";
import { admin, customerSaysPaid, type OrderRow } from "./data";
import { Loading, PageTitle, useLoad } from "./kit";

const TABS: { key: string; label: string; test: (o: OrderRow) => boolean }[] = [
  { key: "awaiting", label: "Awaiting payment", test: (o) => o.payment_status === "awaiting" && o.status !== "cancelled" },
  { key: "make", label: "To make & ship", test: (o) => ["payment_confirmed", "preparing", "production"].includes(o.status) },
  { key: "shipped", label: "Shipped", test: (o) => o.status === "shipped" },
  { key: "done", label: "Delivered", test: (o) => o.status === "delivered" },
  { key: "cancelled", label: "Cancelled", test: (o) => o.status === "cancelled" },
  { key: "all", label: "All", test: () => true },
];

export default function Orders() {
  const { id } = useParams();
  return id ? <OrderDetail id={id} /> : <OrderList />;
}

function OrderList() {
  const [q, setQ] = useSearchParams();
  const tab = q.get("tab") ?? "awaiting";
  const [search, setSearch] = useState("");
  const { data, error } = useLoad(admin.orders);
  const rows = useMemo(() => {
    const t = TABS.find((x) => x.key === tab) ?? TABS[0];
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((o) => (s ? [o.number, o.name, o.email].some((v) => v.toLowerCase().includes(s)) : t.test(o)));
  }, [data, tab, search]);
  return (
    <>
      <PageTitle title="Orders" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {TABS.map((t) => {
            const n = (data ?? []).filter(t.test).length;
            return (
              <button key={t.key} onClick={() => { setSearch(""); setQ({ tab: t.key }); }} className={`shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-semibold ${tab === t.key && !search ? "border-choc bg-choc text-cream" : "border-sand bg-paper hover:border-choc"}`}>
                {t.label} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <label className="relative sm:ml-auto sm:w-64">
          <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-choc-soft" />
          <input className="field pl-10" placeholder="Order #, name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        </label>
      </div>
      {!data ? <Loading error={error} /> : rows.length === 0 ? (
        <p className="card p-8 text-center text-choc-soft">{search ? "No orders match your search." : "Nothing here right now."}</p>
      ) : (
        <ul className="card divide-y divide-beige overflow-hidden">
          {rows.map((o) => (
            <li key={o.id}>
              <Link to={`/admin/orders/${o.id}`} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-4 hover:bg-oat/40 sm:grid-cols-[120px_1fr_auto_auto_150px] sm:items-center">
                <span className="font-mono font-bold">{o.number}</span>
                <span className="text-right font-semibold sm:order-4">{moneyExact(o.total_cents)}</span>
                <span className="min-w-0 truncate text-[14.5px] sm:order-2">{o.name} <span className="text-choc-soft">· {o.shop_order_items.reduce((s, i) => s + i.quantity, 0)} item(s)</span></span>
                <span className="text-right text-[13px] text-choc-soft sm:order-3">{date(o.created_at)}</span>
                <span className="col-span-2 flex flex-wrap items-center gap-2 sm:order-5 sm:col-span-1 sm:justify-end">
                  {o.payment_status === "awaiting" && o.status !== "cancelled" && customerSaysPaid(o) && <span className="chip bg-sky">Says paid</span>}
                  <StatusPill status={o.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const CARRIERS: Record<string, (n: string) => string> = {
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  DHL: (n) => `https://www.dhl.com/us-en/home/tracking/tracking-express.html?tracking-id=${encodeURIComponent(n)}`,
};
const NEXT: OrderStatus[] = ["preparing", "production", "shipped", "delivered"];

function OrderDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: order, error, setData } = useLoad(() => admin.order(id), [id]);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, fn: () => Promise<Order>, ok: string) => {
    setBusy(key);
    try {
      setData(await fn());
      toast(ok);
    } catch (x) {
      toast(friendly(x), "error");
    } finally {
      setBusy(null);
    }
  };

  if (!order) return <Loading error={error} />;
  const verified = order.payment_status === "verified";
  const cancelled = order.status === "cancelled";
  const customerUrl = `${SITE_URL}/order/${order.number}?t=${order.token}`;
  const mail = (subject: string, body: string) => `mailto:${order.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const first = order.name.split(" ")[0];

  return (
    <>
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold hover:underline"><ArrowLeft size={16} /> Orders</button>
      <PageTitle title={order.number}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={order.status} />
          <a href={customerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-sand bg-paper px-3 py-1.5 text-[12.5px] font-semibold hover:border-choc">Customer view <ExternalLink size={13} /></a>
        </div>
      </PageTitle>
      <p className="-mt-4 mb-6 text-[14px] text-choc-soft">Placed {date(order.created_at, true)} · {moneyExact(order.total_cents)}</p>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid h-fit gap-6">
          {!cancelled && !verified && <VerifyPayment order={order} busy={busy === "verify"} onVerify={(a, r, p, n) => act("verify", () => admin.verify(order.id, a, r, p, n), "Payment verified — the customer's order now shows Payment Confirmed.")} />}
          {verified && (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-2xl"><BadgeCheck className="text-sage-deep" /> Payment verified</h2>
              {order.payments?.filter((p) => p.status === "verified").map((p) => (
                <p key={p.id} className="mt-2 text-[14.5px]">
                  {moneyExact(p.amount_cents)} via Venmo{p.payer ? ` from ${p.payer}` : ""}{p.reference ? ` · ref ${p.reference}` : ""} · {p.verified_at ? date(p.verified_at, true) : ""}
                  {p.amount_cents !== order.total_cents && <span className="mt-1 block font-semibold text-caramel">Note: order total is {moneyExact(order.total_cents)}.</span>}
                </p>
              ))}
              {!["shipped", "delivered"].includes(order.status) && (
                <button
                  className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-rose underline"
                  disabled={!!busy}
                  onClick={() => {
                    const why = prompt("Undo the payment verification? The order goes back to Awaiting Payment.\n\nReason (optional, shown to the customer):", "Payment not found in Venmo.");
                    if (why !== null) act("reset", () => admin.resetPayment(order.id, why), "Payment verification undone.");
                  }}
                >
                  <Undo2 size={15} /> Undo verification
                </button>
              )}
            </section>
          )}

          {!cancelled && <StatusControl order={order} busy={busy} onSet={(s, note) => act(s, () => admin.setStatus(order.id, s, note), `Order moved to ${STATUS[s].label}.`)} />}
          {!cancelled && <Tracking order={order} busy={busy === "tracking"} onSave={(c, n, u) => act("tracking", () => admin.setTracking(order.id, c, n, u), "Tracking saved — it now shows on the customer's order page.")} />}

          <section className="card p-5">
            <h2 className="text-2xl">Items</h2>
            <ul className="mt-3 divide-y divide-beige">
              {order.items.map((it, i) => (
                <li key={i} className="flex gap-3 py-3">
                  <Img src={it.image} alt={it.name} width={160} sizes="64px" className="h-20 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 text-[14.5px]">
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-choc-soft">{it.color} · Size {it.size} · Qty {it.quantity} × {money(it.unit_price_cents)}</div>
                  </div>
                  <div className="font-semibold">{money(it.line_total_cents)}</div>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid gap-1 border-t border-beige pt-3 text-[14.5px]">
              <div className="flex justify-between"><span>Subtotal</span><span>{moneyExact(order.subtotal_cents)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{order.shipping_cents ? moneyExact(order.shipping_cents) : "Free"}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{moneyExact(order.total_cents)}</span></div>
            </div>
          </section>
        </div>

        <div className="grid h-fit gap-6">
          <section className="card p-5 text-[14.5px]">
            <h2 className="text-2xl">Customer</h2>
            <p className="mt-2">{order.name}<br /><a className="underline" href={`mailto:${order.email}`}>{order.email}</a>{order.phone && <><br /><a className="underline" href={`tel:${order.phone}`}>{order.phone}</a></>}</p>
            {order.shipping && (
              <>
                <h3 className="mt-4 font-sans text-[12.5px] font-bold tracking-wider text-choc-soft uppercase">Ship to</h3>
                <p className="mt-1">{order.shipping.name}<br />{order.shipping.line1}{order.shipping.line2 && <>, {order.shipping.line2}</>}<br />{order.shipping.city}, {order.shipping.state} {order.shipping.zip}</p>
                <div className="mt-2"><CopyButton label="Copy address" text={`${order.shipping.name}\n${order.shipping.line1}${order.shipping.line2 ? `\n${order.shipping.line2}` : ""}\n${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}`} /></div>
              </>
            )}
            {order.customer_note && <><h3 className="mt-4 font-sans text-[12.5px] font-bold tracking-wider text-choc-soft uppercase">Customer note</h3><p className="mt-1 whitespace-pre-line">{order.customer_note}</p></>}
            <h3 className="mt-4 font-sans text-[12.5px] font-bold tracking-wider text-choc-soft uppercase">Email the customer</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="chip bg-oat normal-case" href={mail(`Your Marshmallow Knitwear order ${order.number}`, `Hi ${first},\n\nThank you for your order ${order.number}!\n\nYou can see its status any time here:\n${customerUrl}\n\nWith love,\nMarshmallow Knitwear`)}><Mail size={13} className="mr-1" /> Order link</a>
              {!verified && !cancelled && <a className="chip bg-butter normal-case" href={mail(`Payment for order ${order.number}`, `Hi ${first},\n\nThank you for your order ${order.number} (${moneyExact(order.total_cents)}). We haven't found your Venmo payment yet. Please send it with your order number in the note — the payment page is here:\n${customerUrl}\n\nWith love,\nMarshmallow Knitwear`)}><Mail size={13} className="mr-1" /> Payment reminder</a>}
              {verified && <a className="chip bg-sage normal-case" href={mail(`Payment received — order ${order.number}`, `Hi ${first},\n\nWe've received your Venmo payment for order ${order.number} — thank you! We'll start on your order now. Follow along here:\n${customerUrl}\n\nWith love,\nMarshmallow Knitwear`)}><Mail size={13} className="mr-1" /> Payment received</a>}
              {order.shipping?.tracking_number && <a className="chip bg-blush normal-case" href={mail(`Your order ${order.number} has shipped!`, `Hi ${first},\n\nYour order ${order.number} is on its way! ${order.shipping.carrier ?? "Tracking"}: ${order.shipping.tracking_number}${order.shipping.tracking_url ? `\n${order.shipping.tracking_url}` : ""}\n\nOrder page: ${customerUrl}\n\nWith love,\nMarshmallow Knitwear`)}><Mail size={13} className="mr-1" /> Shipped</a>}
            </div>
          </section>
          <Notes order={order} />
          <section className="card p-5">
            <h2 className="text-2xl">History</h2>
            <ol className="mt-3 grid gap-3 text-[14px]">
              {[...order.events].reverse().map((e, i) => (
                <li key={i} className="border-l-2 border-beige pl-3">
                  <div className="font-semibold">{STATUS[e.status as OrderStatus]?.label ?? e.status}</div>
                  {e.note && <div className="text-choc-soft">{e.note}</div>}
                  <div className="text-[12.5px] text-choc-soft">{date(e.created_at, true)}</div>
                </li>
              ))}
            </ol>
          </section>
          {!cancelled && (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose/50 px-5 py-3 text-[14px] font-semibold text-rose hover:bg-rose/10"
              disabled={!!busy}
              onClick={() => {
                const why = prompt(`Cancel order ${order.number}? This can't be undone.\n\nReason (optional, shown to the customer):`, "");
                if (why !== null) act("cancelled", () => admin.setStatus(order.id, "cancelled", why), "Order cancelled.");
              }}
            >
              <Ban size={16} /> Cancel order
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function VerifyPayment({ order, busy, onVerify }: { order: Order; busy: boolean; onVerify: (amount: number, ref: string, payer: string, note: string) => void }) {
  const pending = order.payments?.find((p) => p.status === "pending");
  const [amount, setAmount] = useState((order.total_cents / 100).toFixed(2));
  const [ref, setRef] = useState("");
  const [payer, setPayer] = useState(pending?.payer ?? "");
  const [note, setNote] = useState("");
  const [sure, setSure] = useState(false);
  const cents = Math.round(parseFloat(amount || "0") * 100);
  const reported = order.events.some((e) => e.note?.startsWith("Customer reported"));
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-beige bg-butter/50 p-5">
        <h2 className="flex items-center gap-2 text-2xl"><Hourglass className="text-caramel" /> Awaiting payment</h2>
        <p className="mt-2 text-[14.5px]">
          Open Venmo and look for a payment of <b>{moneyExact(order.total_cents)}</b> with <b className="font-mono">{order.number}</b> in the note (it will read "{paymentNote(order.number)}"). Only verify once you can see the money in your Venmo account.
        </p>
        {reported && <p className="mt-2 rounded-xl bg-sky/70 px-3 py-2 text-[14px]"><b>The customer says they've sent it</b>{pending?.payer ? ` from ${pending.payer}` : ""}{pending?.note ? ` — ${pending.note}` : ""}. This is their claim only; please check Venmo.</p>}
        <p className="mt-2 text-[13px] text-choc-soft">Paying to: @{cleanHandle(order.venmo_username)}</p>
      </div>
      <form
        className="grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (cents <= 0) return;
          onVerify(cents, ref, payer, note);
        }}
      >
        <Field label="Amount received in Venmo ($)" error={cents > 0 && cents !== order.total_cents ? `This doesn't match the order total of ${moneyExact(order.total_cents)}.` : null}>
          <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
        </Field>
        <Field label="Venmo payer name (optional)"><input className="field" value={payer} onChange={(e) => setPayer(e.target.value)} /></Field>
        <Field label="Venmo transaction ID (optional)" hint="Found in the payment's details in Venmo."><input className="field" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        <Field label="Private note (optional)"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="flex items-start gap-3 text-[14.5px] sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-5 accent-[#3f2a20]" checked={sure} onChange={(e) => setSure(e.target.checked)} />
          I can see this payment in my Venmo account.
        </label>
        <button className="btn btn-dark sm:col-span-2 sm:justify-self-start" disabled={!sure || busy || cents <= 0}>{busy ? <Spinner /> : <><BadgeCheck size={18} /> Mark payment verified</>}</button>
      </form>
    </section>
  );
}

function StatusControl({ order, busy, onSet }: { order: Order; busy: string | null; onSet: (s: OrderStatus, note: string) => void }) {
  const [note, setNote] = useState("");
  const verified = order.payment_status === "verified";
  const cur = ["payment_confirmed", ...NEXT].indexOf(order.status);
  return (
    <section className="card p-5">
      <h2 className="text-2xl">Order progress</h2>
      {!verified && <p className="mt-2 text-[14px] text-choc-soft">Verify the payment first — then you can move the order forward.</p>}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {NEXT.map((s, i) => {
          const done = verified && cur > i;
          const isCur = order.status === s;
          return (
            <button
              key={s}
              disabled={!verified || isCur || !!busy}
              onClick={() => onSet(s, note)}
              className={`rounded-xl border px-3 py-3 text-left text-[13.5px] font-semibold transition disabled:cursor-not-allowed ${isCur ? "border-choc bg-choc text-cream" : done ? "border-sage-deep/40 bg-sage/40" : "border-sand bg-paper hover:border-choc disabled:opacity-50"}`}
            >
              {busy === s ? <Spinner /> : STATUS[s].label}
            </button>
          );
        })}
      </div>
      <Field label="Note to the customer (optional)" hint="Shown on their order page with the status change." className="mt-4">
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Your cardigan is on the needles!" />
      </Field>
    </section>
  );
}

function Tracking({ order, busy, onSave }: { order: Order; busy: boolean; onSave: (c: string, n: string, u: string) => void }) {
  const s = order.shipping;
  const [carrier, setCarrier] = useState(s?.carrier ?? "USPS");
  const [num, setNum] = useState(s?.tracking_number ?? "");
  const [url, setUrl] = useState(s?.tracking_url ?? "");
  useEffect(() => {
    setCarrier(s?.carrier ?? "USPS");
    setNum(s?.tracking_number ?? "");
    setUrl(s?.tracking_url ?? "");
  }, [s?.tracking_number, s?.carrier, s?.tracking_url]);
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-2xl"><Truck size={22} /> Tracking</h2>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]"
        onSubmit={(e) => {
          e.preventDefault();
          const n = num.trim();
          onSave(carrier, n, url.trim() || (n && CARRIERS[carrier] ? CARRIERS[carrier](n) : ""));
        }}
      >
        <Field label="Carrier">
          <select className="field" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
            {[...Object.keys(CARRIERS), "Other"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Tracking number"><input className="field font-mono" value={num} onChange={(e) => setNum(e.target.value)} /></Field>
        <Field label="Tracking link (optional)" hint={CARRIERS[carrier] ? "Leave empty and we'll create the link for you." : undefined} className="sm:col-span-2">
          <input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="btn btn-dark" disabled={busy}>{busy ? <Spinner /> : "Save tracking"}</button>
          {order.status !== "shipped" && order.status !== "delivered" && <span className="text-[13px] text-choc-soft">Tip: then press <b>Shipped</b> above.</span>}
        </div>
      </form>
    </section>
  );
}

function Notes({ order }: { order: Order }) {
  const toast = useToast();
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = notes !== (order.admin_notes ?? "");
  return (
    <section className="card p-5">
      <h2 className="text-2xl">Private notes</h2>
      <textarea className="field mt-3 min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only you can see these." />
      <button
        className="btn btn-light mt-3 min-h-10 px-5 text-[13.5px]"
        disabled={!dirty || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await admin.saveNotes(order.id, notes.trim());
            order.admin_notes = notes.trim();
            toast("Notes saved.");
          } catch (x) {
            toast(friendly(x), "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Spinner /> : "Save notes"}
      </button>
    </section>
  );
}
