import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, Camera as Instagram, Mail, Phone, RotateCcw, Truck } from "lucide-react";
import { api } from "../lib/api";
import { friendly } from "../lib/supabase";
import { money } from "../lib/format";
import { useMeta } from "../lib/seo";
import { useCatalog } from "../state/store";
import { Field, Spinner } from "../components/ui";
import { Marshmallow } from "../components/Brand";

const SUBJECTS = ["General question", "Question about my order", "Custom order", "Shipping & returns", "Wholesale or collaboration", "Something else"];

export function useFaq() {
  const { settings } = useCatalog();
  const free = settings.free_shipping_over_cents;
  return [
    ["How do I pay?", "We accept Venmo. After you place your order, you'll see our Venmo details, a QR code and your order number. Include the order number in your Venmo note so we can match your payment. We confirm every payment by hand and email you once it's verified."],
    ["When does my order start being made?", "As soon as we've verified your Venmo payment, your order moves to Payment Confirmed and we start preparing it. You can follow every step on your order page."],
    ["How long does a handmade cardigan take?", `Most pieces take ${settings.processing_time} to knit and finish before shipping. Custom pieces usually take 3–5 weeks after your quote is approved.`],
    ["How much is shipping?", `Shipping within the US is a flat ${money(settings.shipping_flat_cents)}${free ? `, and free on orders over ${money(free)}` : ""}. You'll get a tracking number as soon as your order ships.`],
    ["Will my cardigan look exactly like the photos?", "Very close — but because every piece is knitted by hand, there may be small variations in stitches, colour and pattern placement. That's what makes yours one of a kind."],
    ["How do I choose my size?", "Each product page has a size guide with chest and length measurements. Many of our cardigans are designed to be relaxed or oversized, so if you're between sizes, size down for a closer fit. Still unsure? Message us — we're happy to help."],
    ["Can I request a custom colour or size?", "Yes! Use our Custom Orders form to tell us your idea and share reference photos. We'll reply with a personal quote before anything is charged."],
    ["How do I care for my cardigan?", "Hand wash cold with a gentle wool wash, press out water in a towel (don't wring), and dry flat. Store folded, not on a hanger, so it keeps its shape."],
  ] as [string, string][];
}

export default function Contact() {
  const { settings } = useCatalog();
  const faq = useFaq();
  useMeta({
    title: "Contact & FAQ",
    description: "Questions about an order, sizing or a custom cardigan? Contact Marshmallow Knitwear — plus answers to common questions about payment, shipping and returns.",
    path: "/contact",
    jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  });
  const [f, setF] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => {
    setF((o) => ({ ...o, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = "Please enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim())) er.email = "Please enter a valid email address.";
    if (f.message.trim().length < 5) er.message = "Please write a message.";
    setErrors(er);
    if (Object.values(er).some(Boolean)) return;
    setBusy(true);
    setFail(null);
    try {
      await api.submitMessage({ name: f.name.trim(), email: f.email.trim(), subject: f.subject, message: f.message.trim() });
      setSent(true);
    } catch (x) {
      setFail(friendly(x));
    } finally {
      setBusy(false);
    }
  };
  const ig = settings.instagram.replace(/^@/, "");

  return (
    <>
      <section className="wrap grid gap-12 py-14 lg:grid-cols-[1fr_1.15fr] lg:py-20">
        <div>
          <div className="eyebrow">Contact</div>
          <h1 className="mt-3 text-[42px] leading-tight sm:text-[56px]">We'd love to hear from you</h1>
          <p className="mt-4 max-w-md text-[17px] text-choc-soft">Questions about sizing, an order or a custom idea? Send us a note and we'll reply within 1–2 days.</p>
          <ul className="mt-8 grid gap-3 text-[15.5px]">
            <li><a href={`mailto:${settings.contact_email}`} className="card flex items-center gap-4 p-4 hover:shadow-lift"><span className="grid size-11 place-items-center rounded-full bg-blush/70"><Mail size={19} /></span>{settings.contact_email}</a></li>
            <li><a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="card flex items-center gap-4 p-4 hover:shadow-lift"><span className="grid size-11 place-items-center rounded-full bg-sky"><Instagram size={19} /></span>@{ig}</a></li>
            {settings.phone && <li><a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="card flex items-center gap-4 p-4 hover:shadow-lift"><span className="grid size-11 place-items-center rounded-full bg-sage"><Phone size={19} /></span>{settings.phone}</a></li>}
          </ul>
          <p className="mt-6 text-[14.5px] text-choc-soft">Looking for an order? <Link to="/track" className="underline">Track it here</Link> with your order number and email.</p>
        </div>

        <div className="card p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 size={40} className="mx-auto text-sage-deep" />
              <h2 className="mt-4 text-[30px]">Message sent!</h2>
              <p className="mt-2 text-choc-soft">Thank you, {f.name.trim().split(" ")[0]}. We'll reply to {f.email.trim()} soon.</p>
              <button className="btn btn-light mt-6" onClick={() => { setSent(false); setF({ ...f, message: "" }); }}>Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
              <h2 className="text-[28px] sm:col-span-2">Send a message</h2>
              <Field label="Name" error={errors.name}><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-invalid={!!errors.name} maxLength={100} /></Field>
              <Field label="Email" error={errors.email}><input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" aria-invalid={!!errors.email} /></Field>
              <Field label="Subject" className="sm:col-span-2">
                <select className="field" value={f.subject} onChange={(e) => set("subject", e.target.value)}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label="Message" error={errors.message} className="sm:col-span-2" hint={f.subject === "Question about my order" ? "Please include your order number (MK-…)." : undefined}>
                <textarea className="field min-h-40" value={f.message} onChange={(e) => set("message", e.target.value)} maxLength={4000} aria-invalid={!!errors.message} />
              </Field>
              {fail && <p className="text-[14px] font-medium text-rose sm:col-span-2" role="alert">{fail}</p>}
              <button className="btn btn-dark sm:col-span-2 sm:justify-self-start" disabled={busy}>{busy ? <Spinner /> : "Send message"}</button>
            </form>
          )}
        </div>
      </section>

      <section id="faq" className="scroll-mt-28 bg-paper py-16 lg:py-20">
        <div className="wrap max-w-3xl">
          <div className="flex items-center gap-3">
            <Marshmallow tone="butter" face className="h-10 w-10" />
            <h2 className="text-[34px] sm:text-[42px]">Frequently asked questions</h2>
          </div>
          <div className="mt-8 divide-y divide-beige border-y border-beige">
            {faq.map(([q, a]) => (
              <details key={q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown size={19} className="shrink-0 transition group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-[15.5px] leading-relaxed text-choc-soft">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap grid gap-5 py-16 sm:grid-cols-2">
        <Link to="/policies/shipping" className="card flex gap-4 p-6 hover:shadow-lift">
          <Truck className="shrink-0 text-cocoa" />
          <span><b className="font-display text-[21px] font-normal">Shipping</b><br /><span className="text-[15px] text-choc-soft">Processing times, rates and tracking.</span></span>
        </Link>
        <Link to="/policies/returns" className="card flex gap-4 p-6 hover:shadow-lift">
          <RotateCcw className="shrink-0 text-cocoa" />
          <span><b className="font-display text-[21px] font-normal">Returns & exchanges</b><br /><span className="text-[15px] text-choc-soft">What we can accept and how it works.</span></span>
        </Link>
      </section>
    </>
  );
}
