import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, Clock, HandHeart, Package, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { useCatalog } from "../state/store";
import { useMeta, SITE_URL } from "../lib/seo";
import { money } from "../lib/format";
import { sized } from "../lib/img";
import { BadgeChip, Img, Reveal } from "../components/ui";
import { Options, Price, ProductGrid, useAddToBag } from "../components/Product";
import { ProductReviews } from "../components/Reviews";
import NotFound from "./NotFound";

export default function ProductPage() {
  const { slug } = useParams();
  const { products, settings, loading } = useCatalog();
  const p = products.find((x) => x.slug === slug) ?? null;
  const o = useAddToBag(p);
  const [img, setImg] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => setImg(0), [slug]);

  // pick a photo of the chosen colour when there is one
  useEffect(() => {
    if (!p) return;
    const i = p.images.findIndex((x) => x.color === o.color);
    if (i >= 0) goTo(i);
  }, [o.color]); // eslint-disable-line react-hooks/exhaustive-deps

  const processing = p?.processing_time || settings.processing_time;
  const free = settings.free_shipping_over_cents;
  useMeta(
    p
      ? {
          title: p.name,
          description: `${p.subtitle ? p.subtitle + ". " : ""}${p.description}`.slice(0, 158),
          image: sized(p.images[0]?.url, 1200),
          path: `/product/${p.slug}`,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description,
            image: p.images.map((i) => sized(i.url, 1200)),
            brand: { "@type": "Brand", name: "Marshmallow Knitwear" },
            material: p.materials,
            offers: {
              "@type": "Offer",
              url: `${SITE_URL}/product/${p.slug}`,
              priceCurrency: "USD",
              price: (p.price_cents / 100).toFixed(2),
              availability: p.sold_out ? "https://schema.org/SoldOut" : "https://schema.org/MadeToOrder",
              itemCondition: "https://schema.org/NewCondition",
            },
          },
        }
      : { title: "Cardigan", noindex: true },
  );

  if (!p) {
    if (loading) return <div className="wrap grid gap-10 py-10 lg:grid-cols-2"><div className="skeleton aspect-[4/5] rounded-[28px]" /><div className="grid content-start gap-4 pt-6"><div className="skeleton h-10 w-2/3 rounded" /><div className="skeleton h-6 w-1/4 rounded" /><div className="skeleton h-32 rounded" /></div></div>;
    return <NotFound what="cardigan" />;
  }

  function goTo(i: number) {
    setImg(i);
    const el = scroller.current;
    if (el && el.clientWidth) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  const related = products.filter((x) => x.id !== p.id && x.categories.some((c) => p.categories.includes(c))).slice(0, 4);

  return (
    <div>
      <div className="wrap pt-5 text-[13px] text-choc-soft">
        <Link to="/" className="hover:text-choc">Home</Link> <span className="mx-1.5">/</span>
        <Link to={`/shop/${p.audience === "men" ? "men" : p.audience === "women" ? "women" : p.categories[0] ?? ""}`} className="hover:text-choc">{p.audience === "men" ? "Men's" : p.audience === "women" ? "Women's" : "Shop"}</Link> <span className="mx-1.5">/</span>
        <span className="text-choc">{p.name}</span>
      </div>

      <div className="wrap grid gap-8 pt-5 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* gallery: swipe on phones, thumbnails on desktop */}
        <div className="lg:sticky lg:top-[150px] lg:self-start">
          <div className="relative">
            <div
              ref={scroller}
              className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-[28px]"
              onScroll={(e) => {
                const el = e.currentTarget;
                setImg(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {p.images.map((im, i) => (
                <Img key={im.url} src={im.url} alt={im.alt || p.name} className="aspect-[4/5] w-full shrink-0 snap-center" sizes="(min-width:1024px) 50vw, 100vw" width={1400} priority={i === 0} />
              ))}
              {p.images.length === 0 && <Img src={null} alt={p.name} className="aspect-[4/5] w-full shrink-0" />}
            </div>
            <div className="absolute top-4 left-4 flex gap-2">{p.sold_out ? <span className="chip bg-choc text-cream">Sold out</span> : <BadgeChip badge={p.badge} />}</div>
            {p.images.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 lg:hidden">
                {p.images.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === img ? "w-6 bg-paper" : "w-1.5 bg-paper/60"}`} />)}
              </div>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 hidden gap-3 lg:flex">
              {p.images.map((im, i) => (
                <button key={im.url} onClick={() => goTo(i)} className={`overflow-hidden rounded-2xl ring-offset-2 ring-offset-cream transition ${i === img ? "ring-2 ring-choc" : "opacity-70 hover:opacity-100"}`} aria-label={`Show photo ${i + 1}`}>
                  <Img src={im.url} alt="" className="h-28 w-[90px]" width={200} sizes="90px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* details */}
        <div className="pb-4 lg:pt-4">
          <h1 className="text-[36px] leading-[1.08] sm:text-[46px]">{p.name}</h1>
          {p.subtitle && <p className="mt-2 text-[17px] text-choc-soft">{p.subtitle}</p>}
          <div className="mt-4 flex items-center gap-4">
            <Price p={p} className="text-[24px] font-semibold" />
            <a href="#reviews" className="text-[13px] text-choc-soft underline underline-offset-4">Reviews</a>
          </div>
          <p className="mt-6 text-[16px] leading-relaxed text-choc/85">{p.description}</p>

          <div className="mt-8">
            <Options p={p} color={o.color} setColor={o.setColor} size={o.size} setSize={o.setSize} qty={o.qty} setQty={o.setQty} sizeError={o.sizeError} />
          </div>

          <button onClick={o.add} disabled={p.sold_out} className="btn btn-dark mt-8 w-full text-[16px]">
            <ShoppingBag size={19} /> {p.sold_out ? "Sold out" : `Add to bag — ${money(o.price * o.qty)}`}
          </button>
          {p.sold_out && <Link to="/custom-orders" className="btn btn-light mt-3 w-full">Request one made for you</Link>}

          <ul className="mt-6 grid gap-3 rounded-2xl bg-oat/70 p-5 text-[14.5px]">
            <li className="flex gap-3"><Clock size={19} className="mt-0.5 shrink-0 text-cocoa" /><span><b className="font-semibold">Made to order:</b> ready to ship in about {processing}.</span></li>
            <li className="flex gap-3"><Package size={19} className="mt-0.5 shrink-0 text-cocoa" /><span><b className="font-semibold">Shipping:</b> {money(settings.shipping_flat_cents)} flat rate in the US{free != null && <>, free on orders over {money(free)}</>}.</span></li>
            <li className="flex gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-cocoa" /><span><b className="font-semibold">Pay with Venmo</b> at checkout — we confirm every payment personally.</span></li>
          </ul>

          <div className="knit mt-6 flex gap-4 rounded-2xl border border-sage bg-sage/30 p-5">
            <Sparkles size={22} className="mt-0.5 shrink-0 text-sage-deep" />
            <p className="text-[14.5px] leading-relaxed"><b className="font-semibold">Every cardigan is unique.</b> Because each piece is knitted by hand, you may notice tiny variations in stitch, tension or colour between cardigans. They're not flaws — they're the fingerprints of handmade, and what makes yours one of a kind.</p>
          </div>

          <div className="mt-6 divide-y divide-beige border-y border-beige">
            <Accordion title="Materials & care" open>
              <p><b className="font-semibold">Materials:</b> {p.materials || "Soft natural fibres."}</p>
              {p.care && <p className="mt-2"><b className="font-semibold">Care:</b> {p.care}</p>}
            </Accordion>
            <Accordion title="Handmade details">
              <ul className="grid gap-1.5">
                {p.details.map((d) => <li key={d} className="flex gap-2"><HandHeart size={16} className="mt-1 shrink-0 text-blush-deep" />{d}</li>)}
                <li className="flex gap-2"><HandHeart size={16} className="mt-1 shrink-0 text-blush-deep" />Knitted by hand in small batches, then washed, blocked and finished by hand.</li>
              </ul>
            </Accordion>
            <Accordion title="Processing time">
              <p>Each cardigan is made to order. Please allow about <b className="font-semibold">{processing}</b> for us to knit and finish yours after your payment is confirmed. We'll email you when it's on its way.</p>
            </Accordion>
            <Accordion title="Shipping & returns">
              <p>We ship within the United States with tracking. Flat-rate shipping is {money(settings.shipping_flat_cents)}{free != null && <>, free on orders over {money(free)}</>}. Standard pieces can be returned unworn within 14 days of delivery; custom and made-to-measure pieces are final sale. <Link to="/policies/shipping" className="underline">Shipping</Link> · <Link to="/policies/returns" className="underline">Returns</Link></p>
            </Accordion>
          </div>
        </div>
      </div>

      <ProductReviews product={p} />

      {related.length > 0 && (
        <section className="wrap pt-20 sm:pt-28">
          <Reveal><h2 className="mb-8 text-[32px] sm:text-[40px]">You may also love</h2></Reveal>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group py-1" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown size={18} className="transition group-open:rotate-180" />
      </summary>
      <div className="pb-5 text-[15px] leading-relaxed text-choc/80">{children}</div>
    </details>
  );
}
