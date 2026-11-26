import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { money } from "../lib/format";
import { useMeta } from "../lib/seo";
import { useCatalog } from "../state/store";
import type { Settings } from "../lib/types";
import NotFound from "./NotFound";

type Doc = { title: string; intro: string; body: (s: Settings) => ReactNode };

const H = ({ children }: { children: ReactNode }) => <h2 className="mt-10 text-[26px]">{children}</h2>;

export const POLICIES: Record<string, Doc> = {
  shipping: {
    title: "Shipping Policy",
    intro: "How and when your handmade order gets to you.",
    body: (s) => (
      <>
        <H>Processing time</H>
        <p>Every piece is made by hand. Most orders take <b>{s.processing_time}</b> to knit, finish and pack after your payment is verified. Custom and made-to-measure pieces usually take 3–5 weeks after your quote is approved. Your order page shows each stage as it happens.</p>
        <H>Rates</H>
        <p>We currently ship within the United States. Shipping is a flat <b>{money(s.shipping_flat_cents)}</b> per order{s.free_shipping_over_cents ? <>, and <b>free on orders over {money(s.free_shipping_over_cents)}</b></> : null}. The exact amount is shown in your bag before you place your order.</p>
        <H>Tracking</H>
        <p>When your order ships, we add the tracking number to your order page and email it to you. Delivery usually takes 2–6 business days after shipping, depending on the carrier and your location.</p>
        <H>Address problems</H>
        <p>Please double-check your address at checkout. If you spot a mistake, <Link to="/contact" className="underline">contact us</Link> right away — we can update it any time before your order ships.</p>
      </>
    ),
  },
  returns: {
    title: "Returns Policy",
    intro: "Our promise on handmade pieces.",
    body: (s) => (
      <>
        <H>Ready-made pieces</H>
        <p>If your ready-made cardigan doesn't fit or isn't what you hoped, you can request a return or exchange within <b>14 days of delivery</b>. Items must be unworn, unwashed and in their original condition. Email us at <a className="underline" href={`mailto:${s.contact_email}`}>{s.contact_email}</a> with your order number to start a return.</p>
        <H>Custom and made-to-measure pieces</H>
        <p>Custom pieces are knitted just for you, so they can't be returned unless there is a defect. We'll always talk through the details and share progress before your piece is finished.</p>
        <H>Damaged or incorrect items</H>
        <p>If something arrives damaged or isn't what you ordered, contact us within 7 days of delivery with a photo and we'll make it right with a repair, replacement or refund.</p>
        <H>Refunds</H>
        <p>Approved refunds are sent back through Venmo to the account that paid, once we've received and checked the returned item. Return shipping is paid by the customer unless the item was damaged or incorrect.</p>
        <H>Handmade variations</H>
        <p>Small differences in stitches, colour and pattern placement are a natural part of handmade knitwear and aren't considered defects.</p>
      </>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    intro: "What we collect, why, and how we look after it.",
    body: (s) => (
      <>
        <H>What we collect</H>
        <p>When you place an order we collect your name, email, optional phone number and shipping address. When you send a message or custom request we collect what you write and any reference photos you upload. Your bag contents are saved on your device so they're there when you come back.</p>
        <H>Payments</H>
        <p>Payments are made in Venmo. We never ask for, see or store your Venmo password, card numbers or bank details. We only see what Venmo shows a seller: the name on the payment, the amount and the note.</p>
        <H>How we use it</H>
        <p>We use your information only to make and deliver your order, answer your messages and send updates about your order. We don't sell or rent your information.</p>
        <H>Who we share it with</H>
        <p>We share your shipping details with the shipping carrier, and store data with our hosting and database providers, who process it on our behalf.</p>
        <H>Your choices</H>
        <p>You can ask us to update or delete your information at any time by emailing <a className="underline" href={`mailto:${s.contact_email}`}>{s.contact_email}</a>. We keep order records as long as needed for accounting and tax purposes.</p>
      </>
    ),
  },
  terms: {
    title: "Terms of Service",
    intro: "The simple terms for shopping with us.",
    body: (s) => (
      <>
        <H>Orders</H>
        <p>Placing an order reserves your items. Your order is confirmed once we've verified your Venmo payment for the full amount. Orders that remain unpaid for 7 days may be cancelled.</p>
        <H>Prices</H>
        <p>Prices are in US dollars. The total shown at checkout — including shipping — is the amount to pay. We may correct obvious pricing errors before confirming an order, and we'll always contact you first.</p>
        <H>Handmade products</H>
        <p>Because our products are made by hand, each piece may differ slightly from the photos. Colours can also look different on different screens.</p>
        <H>Custom orders</H>
        <p>Custom requests are reviewed before a final price is provided. Work begins after you approve the quote and your payment is verified.</p>
        <H>Reviews</H>
        <p>Reviews you submit may be shown on our site after approval. Example reviews are clearly marked as samples.</p>
        <H>Contact</H>
        <p>Questions about these terms? Email <a className="underline" href={`mailto:${s.contact_email}`}>{s.contact_email}</a>.</p>
      </>
    ),
  },
};

export default function Policy() {
  const { kind = "" } = useParams();
  const { settings } = useCatalog();
  const doc = POLICIES[kind];
  useMeta({ title: doc?.title ?? "Not found", description: doc ? `${doc.title} — ${doc.intro}` : undefined, path: `/policies/${kind}`, noindex: !doc });
  if (!doc) return <NotFound />;
  return (
    <article className="wrap max-w-3xl py-14 lg:py-20">
      <div className="eyebrow">Policies</div>
      <h1 className="mt-3 text-[42px] sm:text-[54px]">{doc.title}</h1>
      <p className="mt-3 text-[18px] text-choc-soft">{doc.intro}</p>
      <div className="mt-4 text-[16.5px] leading-relaxed text-choc/85 [&_p]:mt-3">{doc.body(settings)}</div>
      <nav className="mt-14 flex flex-wrap gap-2 border-t border-beige pt-6 text-[14px]" aria-label="Other policies">
        {Object.entries(POLICIES).filter(([k]) => k !== kind).map(([k, d]) => (
          <Link key={k} to={`/policies/${k}`} className="rounded-full border border-sand px-4 py-2 hover:border-choc">{d.title}</Link>
        ))}
      </nav>
    </article>
  );
}
