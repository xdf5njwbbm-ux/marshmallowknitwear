import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, Copy, ExternalLink, Hourglass, ShieldCheck, Smartphone, Truck } from "lucide-react";
import type { Order } from "../lib/types";
import { date, FLOW, money, moneyExact, STATUS } from "../lib/format";
import { cleanHandle, isPlaceholder, paymentNote, venmoUrl } from "../lib/venmo";
import { api } from "../lib/api";
import { friendly } from "../lib/supabase";
import { useCatalog, useToast } from "../state/store";
import { Field, Img, Spinner } from "./ui";

export function StatusPill({ status }: { status: Order["status"] }) {
  return <span className={`chip ${STATUS[status].tone}`}>{STATUS[status].label}</span>;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        });
      }}
      className="inline-flex items-center gap-1 rounded-full border border-sand bg-paper px-3 py-1.5 text-[12.5px] font-semibold hover:border-choc"
    >
      {done ? <><Check size={14} /> Copied</> : <><Copy size={14} /> {label}</>}
    </button>
  );
}

/** The Venmo step: amount, order number, instructions, the button and a QR code. Never marks anything paid. */
export function VenmoPayment({ order, onUpdate }: { order: Order; onUpdate: (o: Order) => void }) {
  const { settings } = useCatalog();
  const toast = useToast();
  const username = order.venmo_username || settings.venmo_username;
  const placeholder = isPlaceholder(username);
  const note = paymentNote(order.number);
  const url = venmoUrl(username, order.total_cents, note, order.venmo_link ?? settings.venmo_link);
  const [qr, setQr] = useState("");
  const [sentOpen, setSentOpen] = useState(false);
  const [payer, setPayer] = useState("");
  const [busy, setBusy] = useState(false);
  const reported = order.events.some((e) => e.note?.startsWith("Customer reported"));

  useEffect(() => {
    if (placeholder) return;
    import("qrcode").then((m) => m.default.toDataURL(url, { margin: 1, width: 360, color: { dark: "#3f2a20", light: "#fffdf9" } })).then(setQr).catch(() => setQr(""));
  }, [url, placeholder]);

  const sent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdate(await api.markSent(order.number, order.token, payer));
      setSentOpen(false);
    } catch (x) {
      toast(friendly(x), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card overflow-hidden" aria-labelledby="pay-title">
      <div className="flex items-center justify-between gap-4 border-b border-beige bg-[#eaf4ff] px-6 py-4 sm:px-8">
        {settings.venmo_logo_url ? (
          <img src={settings.venmo_logo_url} alt="Venmo" className="h-7 w-auto" />
        ) : (
          <span className="rounded-lg bg-[#008CFF] px-3 py-1 text-[15px] font-bold tracking-wide text-white">Venmo</span>
        )}
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0a5fb0]"><ShieldCheck size={16} /> Secure payment</span>
      </div>
      <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_220px]">
        <div>
          <h2 id="pay-title" className="text-[30px] leading-tight">Pay Securely With Venmo</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-oat/70 p-4">
              <div className="text-[12px] font-semibold tracking-wider text-choc-soft uppercase">Total due</div>
              <div className="mt-1 font-display text-[32px] leading-none">{moneyExact(order.total_cents)}</div>
            </div>
            <div className="rounded-2xl bg-oat/70 p-4">
              <div className="text-[12px] font-semibold tracking-wider text-choc-soft uppercase">Order number</div>
              <div className="mt-1 flex flex-wrap items-center gap-2"><span className="font-mono text-[17px] font-bold whitespace-nowrap sm:text-[20px] sm:tracking-wide">{order.number}</span><CopyButton text={order.number} /></div>
            </div>
          </div>

          {placeholder ? (
            <div className="mt-6 flex gap-3 rounded-2xl bg-butter p-4 text-[14.5px]">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <span>Our Venmo account is being connected. Your order is saved — please <Link to="/contact" className="underline">contact us</Link> with your order number and we'll send you payment details.</span>
            </div>
          ) : (
            <>
              <ol className="mt-6 grid gap-3 text-[15px]">
                <li className="flex gap-3"><Num n={1} /> <span>Tap <b>Continue to Venmo</b> (or scan the QR code with your phone).</span></li>
                <li className="flex gap-3"><Num n={2} /> <span>Check that you're paying <b>@{cleanHandle(username)}</b> and the amount is <b>{moneyExact(order.total_cents)}</b>.</span></li>
                <li className="flex gap-3"><Num n={3} /> <span><b>Include your order number {order.number} in the payment note</b> — it's filled in for you. This is how we match your payment to your order.</span></li>
                <li className="flex gap-3"><Num n={4} /> <span>Send the payment. We'll confirm it personally and email you once it's verified.</span></li>
              </ol>
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn mt-7 w-full bg-[#008CFF] text-white hover:bg-[#0074d4] sm:w-auto">
                Continue to Venmo <ExternalLink size={17} />
              </a>
              <p className="mt-3 flex items-start gap-2 text-[13px] text-choc-soft">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" /> You'll finish payment in Venmo itself. We never ask for your Venmo password or bank details, and nothing is charged on this website.
              </p>
            </>
          )}
        </div>
        {!placeholder && (
          <div className="text-center">
            {qr ? <img src={qr} alt={`QR code to pay ${moneyExact(order.total_cents)} to @${cleanHandle(username)} on Venmo`} className="mx-auto w-full max-w-[220px] rounded-2xl border border-beige" /> : <div className="skeleton mx-auto aspect-square w-full max-w-[220px] rounded-2xl" />}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-choc-soft"><Smartphone size={14} /> Scan to pay in the Venmo app</p>
          </div>
        )}
      </div>
      {!placeholder && <div className="border-t border-beige bg-paper px-6 py-5 sm:px-8">
        {reported ? (
          <p className="flex items-start gap-3 text-[15px]"><Hourglass size={19} className="mt-0.5 shrink-0 text-caramel" /> <span><b>Thank you!</b> Your order has been received and is awaiting payment confirmation. We'll email you as soon as we've verified your Venmo payment.</span></p>
        ) : sentOpen ? (
          <form onSubmit={sent} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Your Venmo name or @username (optional)" hint="Helps us find your payment faster." className="flex-1">
              <input className="field" value={payer} onChange={(e) => setPayer(e.target.value)} maxLength={60} placeholder="@your-venmo" />
            </Field>
            <button className="btn btn-dark" disabled={busy}>{busy ? <Spinner /> : "Let the shop know"}</button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] text-choc-soft">Already sent it in Venmo?</span>
            <button onClick={() => setSentOpen(true)} className="btn btn-light min-h-11">I've sent my payment</button>
          </div>
        )}
      </div>}
    </section>
  );
}

function Num({ n }: { n: number }) {
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-choc text-[13px] font-bold text-cream">{n}</span>;
}

export function Timeline({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return <div className="rounded-2xl bg-oat p-5 text-[15px]">This order was cancelled. If you have questions, please <Link to="/contact" className="underline">contact us</Link>.</div>;
  }
  const cur = FLOW.indexOf(order.status);
  return (
    <ol className="grid gap-0">
      {FLOW.map((s, i) => {
        const done = i < cur;
        const now = i === cur;
        const ev = [...order.events].reverse().find((e) => e.status === s);
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
            {i < FLOW.length - 1 && <span className={`absolute top-8 left-[13px] h-[calc(100%-24px)] w-0.5 ${done ? "bg-sage-deep" : "bg-beige"}`} />}
            <span className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${done ? "bg-sage-deep text-white" : now ? "bg-choc text-cream ring-4 ring-blush" : "bg-oat text-choc-soft"}`}>
              {done ? <Check size={15} /> : i + 1}
            </span>
            <div className="pt-0.5">
              <div className={`text-[15px] font-semibold ${!done && !now ? "text-choc-soft/70" : ""}`}>{STATUS[s].label}</div>
              {now && <div className="text-[14px] text-choc-soft">{STATUS[s].about}</div>}
              {ev && (done || now) && <div className="text-[12.5px] text-choc-soft">{date(ev.created_at, true)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetails({ order }: { order: Order }) {
  const s = order.shipping;
  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-2xl">Items</h2>
        <ul className="mt-4 divide-y divide-beige">
          {order.items.map((it, i) => (
            <li key={i} className="flex gap-4 py-4">
              <Img src={it.image} alt={it.name} className="h-24 w-[76px] shrink-0 rounded-xl" width={200} sizes="76px" />
              <div className="min-w-0 flex-1">
                <Link to={`/product/${it.slug}`} className="font-display text-[18px] leading-snug">{it.name}</Link>
                <div className="mt-1 text-[14px] text-choc-soft">{it.color} · Size {it.size} · Qty {it.quantity}</div>
              </div>
              <div className="text-[15px] font-semibold">{money(it.line_total_cents)}</div>
            </li>
          ))}
        </ul>
        <dl className="mt-2 grid gap-1.5 border-t border-beige pt-4 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{moneyExact(order.subtotal_cents)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{order.shipping_cents ? moneyExact(order.shipping_cents) : "Free"}</dd></div>
          <div className="flex justify-between pt-2 text-xl"><dt className="font-display">Total</dt><dd className="font-semibold">{moneyExact(order.total_cents)}</dd></div>
        </dl>
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-sans text-[13px] font-semibold tracking-wider text-choc-soft uppercase">Customer</h2>
          <p className="mt-2 text-[15px]">{order.name}<br />{order.email}{order.phone && <><br />{order.phone}</>}</p>
          <h2 className="mt-5 font-sans text-[13px] font-semibold tracking-wider text-choc-soft uppercase">Payment</h2>
          <p className="mt-2 text-[15px]">Venmo · {order.payment_status === "verified" ? <span className="font-semibold text-sage-deep">Verified{order.paid_at ? ` ${date(order.paid_at)}` : ""}</span> : <span className="font-semibold text-caramel">Awaiting confirmation</span>}</p>
        </section>
        <section className="card p-6">
          <h2 className="font-sans text-[13px] font-semibold tracking-wider text-choc-soft uppercase">Shipping address</h2>
          {s && <p className="mt-2 text-[15px]">{s.name}<br />{s.line1}{s.line2 && <>, {s.line2}</>}<br />{s.city}, {s.state} {s.zip}</p>}
          {s?.tracking_number && (
            <div className="mt-4 rounded-xl bg-sky/60 p-3 text-[14px]">
              <div className="flex items-center gap-2 font-semibold"><Truck size={16} /> {s.carrier ?? "Tracking"}: {s.tracking_number}</div>
              {s.tracking_url && <a href={s.tracking_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 underline">Track package <ExternalLink size={13} /></a>}
            </div>
          )}
        </section>
      </div>
      {order.customer_note && <section className="card p-6 text-[15px]"><h2 className="font-sans text-[13px] font-semibold tracking-wider text-choc-soft uppercase">Your note</h2><p className="mt-2 whitespace-pre-line">{order.customer_note}</p></section>}
    </div>
  );
}
