import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Lock, Pencil } from "lucide-react";
import { useCart, useCatalog, useToast } from "../state/store";
import { api } from "../lib/api";
import { friendly } from "../lib/supabase";
import { money, US_STATES } from "../lib/format";
import { unitPrice } from "../lib/cart";
import { useMeta } from "../lib/seo";
import { Logo } from "../components/Brand";
import { Field, Img, Spinner } from "../components/ui";
import { rememberOrder } from "./Account";

export type Info = { name: string; email: string; phone: string; line1: string; line2: string; city: string; state: string; zip: string; note: string };
const EMPTY: Info = { name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", zip: "", note: "" };
const SAVED = "mk-checkout-info";

export function validate(f: Info): Partial<Record<keyof Info, string>> {
  const e: Partial<Record<keyof Info, string>> = {};
  if (f.name.trim().split(/\s+/).length < 2 || f.name.trim().length < 3) e.name = "Please enter your first and last name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (f.phone.trim() && !/^[0-9+().\s-]{7,30}$/.test(f.phone.trim())) e.phone = "Please check your phone number.";
  if (f.line1.trim().length < 3) e.line1 = "Please enter your street address.";
  if (f.city.trim().length < 2) e.city = "Please enter your city.";
  if (!f.state) e.state = "Please choose your state.";
  if (!/^\d{5}(-\d{4})?$/.test(f.zip.trim())) e.zip = "Please enter a 5-digit ZIP code.";
  return e;
}

export function Steps({ step }: { step: 1 | 2 | 3 }) {
  const names = ["Information", "Review", "Payment"];
  return (
    <ol className="flex items-center gap-2 text-[12.5px] font-semibold sm:gap-3 sm:text-[13px]" aria-label="Checkout progress">
      {names.map((n, i) => (
        <li key={n} className="flex items-center gap-2 sm:gap-3">
          <span className={`flex items-center gap-2 ${i + 1 === step ? "text-choc" : i + 1 < step ? "text-sage-deep" : "text-choc-soft/60"}`} aria-current={i + 1 === step ? "step" : undefined}>
            <span className={`grid size-6 place-items-center rounded-full text-[11px] ${i + 1 === step ? "bg-choc text-cream" : i + 1 < step ? "bg-sage text-choc" : "bg-oat"}`}>{i + 1 < step ? "✓" : i + 1}</span>
            {n}
          </span>
          {i < 2 && <span className="h-px w-5 bg-sand sm:w-8" />}
        </li>
      ))}
    </ol>
  );
}

export function CheckoutShell({ children, step }: { children: React.ReactNode; step: 1 | 2 | 3 }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-beige bg-cream">
        <div className="wrap flex h-[72px] items-center justify-between">
          <Logo />
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-choc-soft"><Lock size={15} /> Secure checkout</span>
        </div>
      </header>
      <div className="wrap pt-6"><Steps step={step} /></div>
      {children}
    </div>
  );
}

export default function Checkout() {
  const cart = useCart();
  const { products, loading } = useCatalog();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState<Info>(() => {
    try {
      return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(SAVED) ?? "{}") };
    } catch {
      return EMPTY;
    }
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Info, string>>>({});
  const [busy, setBusy] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  useMeta({ title: "Checkout", noindex: true });

  useEffect(() => {
    sessionStorage.setItem(SAVED, JSON.stringify(f));
  }, [f]);
  useEffect(() => {
    scrollTo({ top: 0 });
  }, [step]);

  const lines = useMemo(() => cart.lines.map((l) => ({ l, p: products.find((x) => x.id === l.product_id) })), [cart.lines, products]);
  const { subtotal, shipping, total, problems } = cart.summary;

  if (!loading && !cart.lines.length) {
    return (
      <CheckoutShell step={1}>
        <div className="wrap py-20 text-center">
          <h1 className="text-[36px]">Your bag is empty</h1>
          <Link to="/shop" className="btn btn-dark mt-6">Shop cardigans</Link>
        </div>
      </CheckoutShell>
    );
  }

  const set = (k: keyof Info) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const toReview = (e: React.FormEvent) => {
    e.preventDefault();
    const er = validate(f);
    setErrors(er);
    if (Object.keys(er).length) {
      document.querySelector<HTMLElement>(`[name="${Object.keys(er)[0]}"]`)?.focus();
      return;
    }
    setStep(2);
  };

  const place = async () => {
    if (problems.length) return toast("Some items in your bag are unavailable — please update your bag.", "error");
    setBusy(true);
    try {
      const order = await api.placeOrder(
        cart.lines.map(({ product_id, size, color, quantity }) => ({ product_id, size, color, quantity })),
        { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), line1: f.line1.trim(), line2: f.line2.trim(), city: f.city.trim(), state: f.state, zip: f.zip.trim(), note: f.note.trim() },
        cart.token,
      );
      rememberOrder(order);
      cart.clear();
      sessionStorage.removeItem(SAVED);
      api.emailOrder(order.number, order.token);
      navigate(`/order/${order.number}?t=${order.token}&new=1`, { replace: true });
    } catch (x) {
      toast(friendly(x), "error");
      setBusy(false);
    }
  };

  const summary = (
    <div>
      <ul className="grid gap-4">
        {lines.map(({ l, p }) => (
          <li key={l.key} className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Img src={(p?.images.find((i) => i.color === l.color) ?? p?.images[0])?.url} alt={p?.name ?? ""} className="h-20 w-16 rounded-xl" width={160} sizes="64px" />
              <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-choc text-[11px] font-bold text-cream">{l.quantity}</span>
            </div>
            <div className="min-w-0 flex-1 text-[14px]">
              <div className="truncate font-semibold">{p?.name ?? "Unavailable item"}</div>
              <div className="text-choc-soft">{l.color} · Size {l.size}</div>
            </div>
            <div className="text-[14px] font-semibold">{p ? money(unitPrice(p, l.size, l.color) * l.quantity) : "—"}</div>
          </li>
        ))}
      </ul>
      <dl className="mt-6 grid gap-2 border-t border-beige pt-5 text-[15px]">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : money(shipping)}</dd></div>
        <div className="mt-1 flex justify-between border-t border-beige pt-3 text-xl"><dt className="font-display">Total</dt><dd className="font-semibold">{money(total)}</dd></div>
      </dl>
    </div>
  );

  return (
    <CheckoutShell step={step}>
      <div className="wrap grid gap-8 py-6 lg:grid-cols-[1fr_400px] lg:gap-14 lg:py-10">
        {/* order summary — collapsible on phones */}
        <div className="lg:order-2">
          <button className="flex w-full items-center justify-between rounded-2xl border border-beige bg-paper px-5 py-4 lg:hidden" onClick={() => setSummaryOpen(!summaryOpen)} aria-expanded={summaryOpen}>
            <span className="flex items-center gap-2 text-[14px] font-semibold">Order summary <ChevronDown size={16} className={summaryOpen ? "rotate-180" : ""} /></span>
            <span className="font-semibold">{money(total)}</span>
          </button>
          <div className={`card mt-3 p-5 lg:mt-0 lg:block lg:p-7 ${summaryOpen ? "block" : "hidden"}`}>{summary}</div>
        </div>

        <div className="lg:order-1">
          {step === 1 ? (
            <form onSubmit={toReview} noValidate className="grid gap-8">
              <section>
                <h1 className="text-[32px] sm:text-[38px]">Your information</h1>
                <p className="mt-1 text-choc-soft">We'll send your order confirmation and updates here.</p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" error={errors.name} className="sm:col-span-2">
                    <input name="name" className={`field ${errors.name ? "field-error" : ""}`} value={f.name} onChange={set("name")} autoComplete="name" />
                  </Field>
                  <Field label="Email address" error={errors.email}>
                    <input name="email" type="email" inputMode="email" className={`field ${errors.email ? "field-error" : ""}`} value={f.email} onChange={set("email")} autoComplete="email" />
                  </Field>
                  <Field label="Phone number (optional)" error={errors.phone} hint="Only if we need to reach you about your order.">
                    <input name="phone" type="tel" inputMode="tel" className={`field ${errors.phone ? "field-error" : ""}`} value={f.phone} onChange={set("phone")} autoComplete="tel" />
                  </Field>
                </div>
              </section>
              <section>
                <h2 className="text-[26px]">Shipping address</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-6">
                  <Field label="Street address" error={errors.line1} className="sm:col-span-6">
                    <input name="line1" className={`field ${errors.line1 ? "field-error" : ""}`} value={f.line1} onChange={set("line1")} autoComplete="address-line1" />
                  </Field>
                  <Field label="Apartment, suite, etc. (optional)" className="sm:col-span-6">
                    <input name="line2" className="field" value={f.line2} onChange={set("line2")} autoComplete="address-line2" />
                  </Field>
                  <Field label="City" error={errors.city} className="sm:col-span-3">
                    <input name="city" className={`field ${errors.city ? "field-error" : ""}`} value={f.city} onChange={set("city")} autoComplete="address-level2" />
                  </Field>
                  <Field label="State" error={errors.state} className="sm:col-span-2">
                    <select name="state" className={`field ${errors.state ? "field-error" : ""}`} value={f.state} onChange={set("state")} autoComplete="address-level1">
                      <option value="">Choose…</option>
                      {US_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label="ZIP code" error={errors.zip} className="sm:col-span-1">
                    <input name="zip" inputMode="numeric" className={`field ${errors.zip ? "field-error" : ""}`} value={f.zip} onChange={set("zip")} autoComplete="postal-code" maxLength={10} />
                  </Field>
                </div>
                <p className="mt-4 text-[13px] text-choc-soft">We currently ship within the United States (including APO/FPO addresses).</p>
              </section>
              <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
                <Link to="/cart" className="btn-link"><ArrowLeft size={15} /> Back to bag</Link>
                <button className="btn btn-dark w-full sm:w-auto">Continue to review</button>
              </div>
            </form>
          ) : (
            <div className="grid gap-8">
              <section>
                <h1 className="text-[32px] sm:text-[38px]">Review your order</h1>
                <p className="mt-1 text-choc-soft">Please check everything before you continue to payment.</p>
                <ul className="mt-6 divide-y divide-beige rounded-[var(--radius-soft)] border border-beige bg-paper">
                  {lines.map(({ l, p }) => (
                    <li key={l.key} className="flex gap-4 p-4 sm:p-5">
                      <Img src={(p?.images.find((i) => i.color === l.color) ?? p?.images[0])?.url} alt={p?.name ?? ""} className="h-28 w-[88px] shrink-0 rounded-xl" width={240} sizes="88px" />
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[19px] leading-snug">{p?.name}</div>
                        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[14px] text-choc-soft">
                          <dt>Size</dt><dd className="text-choc">{l.size}</dd>
                          <dt>Colour</dt><dd className="text-choc">{l.color}</dd>
                          <dt>Quantity</dt><dd className="text-choc">{l.quantity}</dd>
                        </dl>
                      </div>
                      <div className="text-right text-[15px] font-semibold">{p && money(unitPrice(p, l.size, l.color) * l.quantity)}</div>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="card p-5">
                  <div className="flex items-center justify-between"><h2 className="font-sans text-[13px] font-semibold tracking-wider text-choc-soft uppercase">Contact</h2><button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-[13px] font-semibold underline"><Pencil size={13} /> Edit</button></div>
                  <p className="mt-2 text-[15px]">{f.name}<br />{f.email}{f.phone && <><br />{f.phone}</>}</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center justify-between"><h2 className="font-sans text-[13px] font-semibold tracking-wider text-choc-soft uppercase">Ship to</h2><button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-[13px] font-semibold underline"><Pencil size={13} /> Edit</button></div>
                  <p className="mt-2 text-[15px]">{f.line1}{f.line2 && <>, {f.line2}</>}<br />{f.city}, {f.state} {f.zip}</p>
                </div>
              </section>
              <Field label="Note for us (optional)" hint="Gift message, a special date, anything we should know.">
                <textarea name="note" className="field min-h-24" value={f.note} onChange={set("note")} maxLength={1000} />
              </Field>
              <div className="card grid gap-2 p-5 text-[15px] sm:p-6">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : money(shipping)}</span></div>
                <div className="flex justify-between border-t border-beige pt-3 text-xl"><span className="font-display">Total</span><span className="font-semibold">{money(total)}</span></div>
              </div>
              <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
                <button onClick={() => setStep(1)} className="btn-link"><ArrowLeft size={15} /> Back</button>
                <button onClick={place} disabled={busy || problems.length > 0} className="btn btn-dark w-full sm:w-auto">
                  {busy ? <><Spinner /> Placing your order…</> : <>Place order &amp; continue to payment</>}
                </button>
              </div>
              <p className="text-center text-[13px] text-choc-soft sm:text-right">Next you'll pay with Venmo. Your order is held for you while we confirm your payment.</p>
            </div>
          )}
        </div>
      </div>
    </CheckoutShell>
  );
}
