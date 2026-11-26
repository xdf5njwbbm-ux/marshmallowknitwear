import { Link } from "react-router-dom";
import { ArrowRight, Gem, HandHeart, Camera as Instagram, Leaf, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import { useCatalog } from "../state/store";
import { api } from "../lib/api";
import type { Review } from "../lib/types";
import { useMeta, SITE_URL } from "../lib/seo";
import { asset } from "../lib/img";
import { Marshmallow } from "../components/Brand";
import { ProductGrid } from "../components/Product";
import { Img, Reveal, SectionHead } from "../components/ui";
import { ReviewCard } from "../components/Reviews";

const HERO_W = "https://images.unsplash.com/photo-1588271968087-4c51abe05afc?auto=format&fit=crop&w=1400&q=80";
const HERO_M = "https://images.unsplash.com/photo-1786141251776-7d596304dc77?auto=format&fit=crop&w=1400&q=80";

export default function Home() {
  const { products, categories, settings } = useCatalog();
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    api.reviews().then(setReviews).catch(() => {});
  }, []);
  useMeta({
    path: "/",
    jsonLd: { "@context": "https://schema.org", "@type": "ClothingStore", name: "Marshmallow Knitwear", url: SITE_URL, description: "Handmade knitted cardigans for women and men.", sameAs: [`https://instagram.com/${settings.instagram}`] },
  });
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const newIn = products.filter((p) => p.badge === "new").slice(0, 4);
  const couples = products.find((p) => p.categories.includes("couples"));
  const [h1, h2] = splitHeading(settings.hero_heading);

  return (
    <>
      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div className="wrap grid items-center gap-10 pt-6 pb-14 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pt-12 lg:pb-24">
          <div className="relative z-10 order-2 lg:order-1">
            <Marshmallow tone="sky" className="absolute -top-10 right-6 hidden h-12 w-12 animate-float lg:block" style={{ ["--r" as string]: "-10deg" }} />
            <Marshmallow tone="butter" className="absolute top-40 -left-12 hidden h-10 w-10 animate-float [animation-delay:1.5s] lg:block" style={{ ["--r" as string]: "12deg" }} />
            <div className="eyebrow animate-fade-up">Limited handmade collection</div>
            <h1 className="mt-5 animate-fade-up text-[44px] leading-[1.02] font-[420] [animation-delay:.08s] sm:text-[64px] xl:text-[76px]">
              {h1}
              {h2 && (
                <>
                  <br />
                  <em className="font-[380] text-cocoa" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>{h2}</em>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-md animate-fade-up text-[17px] leading-relaxed text-choc-soft [animation-delay:.16s] sm:text-lg">{settings.hero_text}</p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:.24s]">
              <Link to="/shop/women" className="btn btn-dark">Shop Women's <ArrowRight size={17} /></Link>
              <Link to="/shop/men" className="btn btn-light">Shop Men's <ArrowRight size={17} /></Link>
            </div>
            <div className="mt-10 flex animate-fade-up items-center gap-6 text-[13px] text-choc-soft [animation-delay:.32s]">
              <span className="flex items-center gap-2"><HandHeart size={18} className="text-blush-deep" /> Knitted by hand</span>
              <span className="flex items-center gap-2"><Leaf size={18} className="text-sage-deep" /> Natural fibres</span>
              <span className="hidden items-center gap-2 sm:flex"><Gem size={18} className="text-sky-deep" /> Made to last</span>
            </div>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="grid grid-cols-[1.35fr_1fr] gap-3 sm:gap-4">
              <figure className="relative">
                <Img src={settings.hero_image_women || HERO_W} alt="Woman wearing a handmade knitted cardigan" className="aspect-[3/4] rounded-[30px] shadow-lift" sizes="(min-width:1024px) 30vw, 58vw" width={1100} priority />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1.5 text-[12px] font-semibold backdrop-blur">Women's</figcaption>
              </figure>
              <figure className="relative mt-16 sm:mt-24">
                <Img src={settings.hero_image_men || HERO_M} alt="Man wearing a handmade knitted cardigan" className="aspect-[3/4] rounded-[30px] shadow-lift" sizes="(min-width:1024px) 22vw, 40vw" width={800} priority />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1.5 text-[12px] font-semibold backdrop-blur">Men's</figcaption>
              </figure>
            </div>
            <div className="absolute -bottom-4 left-[52%] hidden -translate-x-1/2 items-center gap-2.5 rounded-full bg-paper px-4 py-2.5 shadow-lift sm:flex">
              <Marshmallow tone="blush" face className="h-8 w-8" />
              <span className="text-[13px] leading-tight"><b className="font-semibold">Every stitch</b><br /><span className="text-choc-soft">tells a story</span></span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute top-0 right-0 -z-10 hidden h-[560px] w-[46%] rounded-bl-[200px] bg-oat/70 lg:block" />
      </section>

      {/* ------------------------------------------------ ribbon */}
      <div className="overflow-hidden border-y border-beige bg-paper py-4" aria-hidden="true">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-[19px] text-choc/80 italic">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["Knitted by hand", "Small batches", "Natural fibres", "Every piece unique", "Made for him & her", "Custom orders welcome"].map((t, i) => (
              <span key={`${k}-${i}`} className="flex items-center gap-12">
                {t}
                <Marshmallow tone={(["blush", "sky", "sage", "butter", "lilac", "cream"] as const)[i]} className="h-6 w-6" />
              </span>
            )),
          )}
        </div>
      </div>

      {/* ------------------------------------------------ categories */}
      <section className="wrap pt-20 sm:pt-28">
        <SectionHead eyebrow="Shop the collection" title={<>Find your <em className="text-cocoa">cosy</em></>}>
          <Link to="/shop" className="btn-link">Shop all <ArrowRight size={15} /></Link>
        </SectionHead>
        <div className="hide-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 60} className={`w-[64%] shrink-0 snap-start sm:w-auto ${i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}>
              <Link to={`/shop/${c.slug}`} className="group relative block overflow-hidden rounded-[26px]">
                <Img src={c.image} alt={c.name} className={`${i === 0 ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[560px]" : "aspect-[4/5]"} w-full transition duration-700 group-hover:scale-[1.03]`} sizes="(min-width:1024px) 25vw, 64vw" width={i === 0 ? 1100 : 640} />
                <div className="absolute inset-0 bg-gradient-to-t from-choc/70 via-choc/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-cream">
                  <h3 className="text-[22px] leading-tight sm:text-[24px]">{c.name}</h3>
                  <p className="mt-1 hidden text-[13.5px] text-cream/80 sm:block">{c.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-wide">Shop now <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ featured */}
      <section className="wrap pt-24 sm:pt-32">
        <SectionHead eyebrow="Loved right now" title="Featured cardigans">
          <Link to="/shop" className="btn-link">View all <ArrowRight size={15} /></Link>
        </SectionHead>
        <ProductGrid products={featured.length ? featured : products.slice(0, 8)} />
      </section>

      {/* ------------------------------------------------ promise */}
      <section className="wrap pt-24 sm:pt-32">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { Icon: HandHeart, tone: "bg-blush/70", title: "Made entirely by hand", text: "Every cardigan is knitted stitch by stitch — around 20 to 40 hours of love in each one." },
            { Icon: Leaf, tone: "bg-sage/70", title: "Soft, natural fibres", text: "Merino, alpaca, cotton and mohair, chosen for softness, warmth and a long, happy life." },
            { Icon: Scissors, tone: "bg-sky/70", title: "Made just for you", text: "Pick your colour, request custom sizing, or dream up something entirely new with us." },
          ].map((x, i) => (
            <Reveal key={x.title} delay={i * 80} className={`knit rounded-[26px] ${x.tone} p-7 sm:p-8`}>
              <x.Icon size={26} strokeWidth={1.6} />
              <h3 className="mt-5 text-[24px]">{x.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-choc/75">{x.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ story teaser with the brand poster */}
      <section className="wrap pt-24 sm:pt-32">
        <div className="grid items-center gap-10 overflow-hidden rounded-[34px] bg-oat p-6 sm:p-10 lg:grid-cols-2 lg:gap-16 lg:p-16">
          <Reveal className="relative mx-auto w-full max-w-[420px]">
            <div className="absolute -inset-3 rotate-[-3deg] rounded-[18px] bg-blush/60" />
            <img src={asset("brand/poster-sm.jpg")} srcSet={`${asset("brand/poster-sm.jpg")} 448w, ${asset("brand/poster.jpg")} 896w`} sizes="(min-width:1024px) 420px, 90vw" alt="Marshmallow Knitwear illustration: a woman in a brown cable-knit cardigan hugging a pile of pastel marshmallows" loading="lazy" className="relative rounded-[14px] shadow-lift" />
          </Reveal>
          <Reveal delay={120}>
            <div className="eyebrow">Our story</div>
            <h2 className="mt-4 text-[36px] leading-[1.08] sm:text-[48px]">Made by hand.<br /><em className="text-cocoa">Made to be loved.</em></h2>
            <p className="mt-5 text-[17px] leading-relaxed text-choc-soft">Marshmallow Knitwear began with a ball of yarn, a cup of cocoa and a simple wish: to make cardigans that feel like a hug. Today every piece is still knitted slowly, by hand, in small batches — soft as a marshmallow and made to be worn for years.</p>
            <Link to="/our-story" className="btn btn-dark mt-8">Read our story <ArrowRight size={17} /></Link>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------ new arrivals */}
      {newIn.length > 0 && (
        <section className="wrap pt-24 sm:pt-32">
          <SectionHead eyebrow="Fresh off the needles" title="New arrivals">
            <Link to="/shop?sort=new" className="btn-link">Shop new <ArrowRight size={15} /></Link>
          </SectionHead>
          <ProductGrid products={newIn} />
        </section>
      )}

      {/* ------------------------------------------------ couples + custom */}
      <section className="wrap grid gap-4 pt-24 sm:pt-32 lg:grid-cols-2">
        <Reveal className="relative overflow-hidden rounded-[30px]">
          <Img src={couples?.images[0]?.url} alt="Couple wearing matching handmade cardigans" className="aspect-[5/4] w-full sm:aspect-[16/11]" sizes="(min-width:1024px) 50vw, 100vw" width={1200} />
          <div className="absolute inset-0 bg-gradient-to-t from-choc/75 via-choc/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-cream sm:p-10">
            <div className="text-[11px] font-semibold tracking-[0.22em] text-cream/80 uppercase">For him & her</div>
            <h2 className="mt-3 text-[32px] leading-tight sm:text-[40px]">Matching couple cardigans</h2>
            <p className="mt-2 max-w-sm text-cream/85">Two cardigans knitted from the same yarn lot — a perfect match, and a perfect gift.</p>
            <Link to="/shop/couples" className="btn btn-cream mt-6">Shop matching sets</Link>
          </div>
        </Reveal>
        <Reveal delay={100} className="knit relative flex flex-col justify-center overflow-hidden rounded-[30px] bg-blush/80 p-8 sm:p-12">
          <Marshmallow tone="cream" face className="absolute top-8 right-8 h-16 w-16 animate-float" style={{ ["--r" as string]: "8deg" }} />
          <div className="eyebrow text-choc/70">Custom orders</div>
          <h2 className="mt-4 max-w-md text-[34px] leading-[1.08] sm:text-[44px]">Dream it up. <em className="text-cocoa">We'll knit it.</em></h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-choc/75">Your favourite colour, a special fit, your initials, a matching pair — tell us your idea and we'll design a one-of-a-kind cardigan with you.</p>
          <Link to="/custom-orders" className="btn btn-dark mt-7 self-start">Start a custom order <ArrowRight size={17} /></Link>
        </Reveal>
      </section>

      {/* ------------------------------------------------ reviews */}
      {reviews.length > 0 && (
        <section className="wrap pt-24 sm:pt-32">
          <SectionHead eyebrow="Kind words" title="From our customers" center />
          {reviews.every((r) => r.is_sample) && (
            <p className="-mt-4 mb-8 text-center text-[13.5px] text-choc-soft">These are sample reviews that show the layout — genuine customer reviews will appear here as they come in.</p>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((r, i) => (
              <Reveal key={r.id} delay={i * 80}>
                <ReviewCard r={r} product={products.find((p) => p.id === r.product_id)} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ instagram */}
      <section className="wrap pt-24 sm:pt-32">
        <SectionHead eyebrow={`@${settings.instagram.replace(/^@/, "")}`} title="Cosy moments, shared">
          <a href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="btn btn-light min-h-11"><Instagram size={17} /> Follow along</a>
        </SectionHead>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
          {products.slice(0, 6).map((p) => (
            <Link key={p.id} to={`/product/${p.slug}`} className="group overflow-hidden rounded-2xl">
              <Img src={p.images[1]?.url ?? p.images[0]?.url} alt={p.name} className="aspect-square w-full transition duration-700 group-hover:scale-105" sizes="(min-width:1024px) 16vw, 33vw" width={480} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

/** "Handmade With Love. Worn With Comfort." → two lines, the second set in italics. */
function splitHeading(h: string): [string, string] {
  const m = h.match(/^(.+?[.!?])\s+(.+)$/);
  return m ? [m[1], m[2]] : [h, ""];
}
