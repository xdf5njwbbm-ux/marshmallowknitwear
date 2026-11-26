import { Link } from "react-router-dom";
import { Heart, Leaf, Scissors, Sparkles } from "lucide-react";
import { useMeta } from "../lib/seo";
import { asset } from "../lib/img";
import { useCatalog } from "../state/store";
import { Img, Reveal } from "../components/ui";
import { Marshmallow } from "../components/Brand";

const VALUES = [
  { icon: Heart, title: "Made with love", text: "Every piece is knitted by hand, one stitch at a time — never mass-produced, never rushed." },
  { icon: Leaf, title: "Soft, lasting yarns", text: "We choose cozy, durable yarns that feel good on your skin and age beautifully with wear." },
  { icon: Scissors, title: "Small-batch & custom", text: "We knit in small batches and love making one-of-a-kind pieces just for you." },
  { icon: Sparkles, title: "Artistic details", text: "Playful colours, hand-placed motifs and little imperfections that make each cardigan its own." },
];

export default function Story() {
  useMeta({
    title: "Our Story",
    description: "Made by hand. Made to be loved. The story behind Marshmallow Knitwear's handmade cardigans.",
    path: "/our-story",
  });
  const { products } = useCatalog();
  const pics = products.flatMap((p) => p.images.slice(1, 2)).slice(0, 2);
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="wrap grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-24">
          <Reveal>
            <div className="eyebrow">Our story</div>
            <h1 className="mt-4 text-[46px] leading-[1.02] sm:text-[68px]">Made By Hand.<br /><i className="text-cocoa">Made To Be Loved.</i></h1>
            <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-choc-soft">
              Marshmallow Knitwear began with a pair of needles, a basket of soft yarn and a simple wish: to make clothes that feel like a hug. Every cardigan we make is knitted by hand with patience and care, so it can be worn, loved and kept for years.
            </p>
          </Reveal>
          <Reveal delay={120} className="relative mx-auto w-full max-w-[440px]">
            <div className="absolute -inset-4 -rotate-2 rounded-[28px] bg-blush/60" />
            <img src={asset("brand/poster-sm.jpg")} srcSet={`${asset("brand/poster-sm.jpg")} 448w, ${asset("brand/poster.jpg")} 896w`} sizes="(min-width:1024px) 440px, 90vw" alt="Marshmallow Knitwear illustration: a woman in a brown cable-knit cardigan hugging a pile of pastel marshmallows" className="relative rounded-[18px] shadow-lift" />
            <Marshmallow tone="sage" face className="absolute -right-5 -bottom-5 h-16 w-16 animate-float" />
          </Reveal>
        </div>
      </section>

      <section className="bg-paper py-16 lg:py-24">
        <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <Reveal className="grid grid-cols-2 gap-4">
            {pics.map((im, i) => (
              <Img key={i} src={im.url} alt={im.alt} width={600} sizes="(min-width:1024px) 260px, 45vw" className={`aspect-[3/4] rounded-[22px] ${i ? "mt-10" : ""}`} />
            ))}
          </Reveal>
          <Reveal className="self-center text-[17px] leading-relaxed text-choc/85">
            <h2 className="text-[34px] leading-tight sm:text-[42px]">Slow fashion, stitched with care</h2>
            <p className="mt-5">A single cardigan can take many hours to knit. We don't hurry that — it's where the warmth comes from. Each piece is shaped, seamed and finished by hand, then checked over before it's wrapped and sent to you.</p>
            <p className="mt-4">Because everything is handmade, tiny variations in stitches, tension and colour are part of the charm. They're the fingerprints of the maker, and they mean your cardigan is truly one of a kind.</p>
            <p className="mt-4">Whether you choose a piece from the shop or dream one up with us, we hope it becomes the cardigan you reach for on every cozy morning.</p>
          </Reveal>
        </div>
      </section>

      <section className="wrap py-16 lg:py-24">
        <h2 className="text-center text-[34px] sm:text-[42px]">What we believe in</h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" delay={i * 80} key={title} className="card p-6">
              <span className="grid size-12 place-items-center rounded-full bg-oat text-cocoa"><Icon size={22} /></span>
              <h3 className="mt-4 text-[21px]">{title}</h3>
              <p className="mt-2 text-[15px] text-choc-soft">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="wrap pb-20">
        <div className="knit relative overflow-hidden rounded-[32px] bg-choc px-6 py-14 text-center text-cream sm:px-12">
          <h2 className="text-[32px] text-cream sm:text-[44px]">Find the one you'll keep forever</h2>
          <p className="mx-auto mt-3 max-w-lg text-cream/80">Browse handmade cardigans for women and men, or request something made just for you.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className="btn btn-cream">Shop all cardigans</Link>
            <Link to="/custom-orders" className="btn border border-cream/40 text-cream hover:bg-cream/10">Request a custom piece</Link>
          </div>
        </div>
      </section>
    </>
  );
}
