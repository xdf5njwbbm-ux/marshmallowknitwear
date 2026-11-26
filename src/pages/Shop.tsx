import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useCatalog } from "../state/store";
import { useMeta } from "../lib/seo";
import { ProductGrid } from "../components/Product";
import { Marshmallow } from "../components/Brand";
import NotFound from "./NotFound";

const SORTS = [
  { v: "featured", l: "Featured" },
  { v: "new", l: "Newest" },
  { v: "price-asc", l: "Price: low to high" },
  { v: "price-desc", l: "Price: high to low" },
];

export default function Shop() {
  const { category } = useParams();
  const [q, setQ] = useSearchParams();
  const { products, categories, loading } = useCatalog();
  const cat = categories.find((c) => c.slug === category);
  const sort = q.get("sort") ?? "featured";
  const color = q.get("color") ?? "";
  const size = q.get("size") ?? "";

  const base = useMemo(() => (category ? products.filter((p) => p.categories.includes(category)) : products), [products, category]);
  const colors = useMemo(() => [...new Set(base.flatMap((p) => p.colors.map((c) => c.name)))].slice(0, 14), [base]);
  const list = useMemo(() => {
    let l = base;
    if (color) l = l.filter((p) => p.colors.some((c) => c.name === color));
    if (size) l = l.filter((p) => p.sizes.includes(size));
    const s = [...l];
    if (sort === "new") s.sort((a, b) => (b.badge === "new" ? 1 : 0) - (a.badge === "new" ? 1 : 0) || b.created_at.localeCompare(a.created_at));
    if (sort === "price-asc") s.sort((a, b) => a.price_cents - b.price_cents);
    if (sort === "price-desc") s.sort((a, b) => b.price_cents - a.price_cents);
    if (sort === "featured") s.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort - b.sort);
    return s.sort((a, b) => Number(a.sold_out) - Number(b.sold_out));
  }, [base, color, size, sort]);

  const title = cat?.name ?? "Shop All Cardigans";
  useMeta({ title, description: cat?.description ?? "Shop handmade knitted cardigans for women and men — oversized, cropped, chunky, custom and matching couple sets.", path: category ? `/shop/${category}` : "/shop" });

  if (category && !loading && !cat) return <NotFound />;

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(q);
    if (v) n.set(k, v);
    else n.delete(k);
    setQ(n, { replace: true });
  };

  return (
    <div>
      <section className="knit border-b border-beige bg-oat/60">
        <div className="wrap relative py-12 text-center sm:py-16">
          <Marshmallow tone="sky" className="absolute top-8 left-[8%] hidden h-10 w-10 animate-float sm:block" />
          <Marshmallow tone="blush" className="absolute right-[10%] bottom-8 hidden h-12 w-12 animate-float [animation-delay:2s] sm:block" />
          <nav className="text-[13px] text-choc-soft" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-choc">Home</Link> <span className="mx-1.5">/</span> {cat ? <><Link to="/shop" className="hover:text-choc">Shop</Link> <span className="mx-1.5">/</span> {cat.name}</> : "Shop"}
          </nav>
          <h1 className="mt-4 text-[40px] leading-tight sm:text-[56px]">{title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-[17px] text-choc-soft">{cat?.description ?? "Every cardigan is knitted by hand in small batches. Choose your colour and size — we'll do the rest."}</p>
        </div>
      </section>

      <div className="sticky top-[72px] z-30 border-b border-beige/70 bg-cream/90 backdrop-blur-md lg:top-[132px]">
        <div className="wrap hide-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <Link to="/shop" className={`shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-medium transition ${!category ? "border-choc bg-choc text-cream" : "border-sand bg-paper hover:border-choc"}`}>All</Link>
          {categories.map((c) => (
            <Link key={c.slug} to={`/shop/${c.slug}`} className={`shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-medium transition ${category === c.slug ? "border-choc bg-choc text-cream" : "border-sand bg-paper hover:border-choc"}`}>
              {c.name.replace(" Cardigans", "").replace("Matching Couple", "Couples").replace("Custom Handmade Pieces", "Custom")}
            </Link>
          ))}
        </div>
      </div>

      <div className="wrap pt-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-choc-soft"><SlidersHorizontal size={15} /> Filter</span>
          <select value={color} onChange={(e) => set("color", e.target.value)} className="rounded-full border border-sand bg-paper py-2 pr-8 pl-4 text-[13.5px]" aria-label="Colour">
            <option value="">All colours</option>
            {colors.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={size} onChange={(e) => set("size", e.target.value)} className="rounded-full border border-sand bg-paper py-2 pr-8 pl-4 text-[13.5px]" aria-label="Size">
            <option value="">All sizes</option>
            {["XS", "S", "M", "L", "XL", "XXL"].map((s) => <option key={s}>{s}</option>)}
          </select>
          {(color || size) && <button onClick={() => setQ(new URLSearchParams(sort !== "featured" ? { sort } : {}), { replace: true })} className="btn-link text-[13px]">Clear</button>}
          <span className="ml-auto flex items-center gap-2 text-[13px] text-choc-soft">
            <span className="hidden sm:inline">{list.length} piece{list.length === 1 ? "" : "s"} ·</span> Sort
            <select value={sort} onChange={(e) => set("sort", e.target.value === "featured" ? "" : e.target.value)} className="rounded-full border border-sand bg-paper py-2 pr-8 pl-4 text-[13.5px] text-choc">
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </span>
        </div>
        {!loading && list.length === 0 ? (
          <div className="card mx-auto max-w-lg p-10 text-center">
            <Marshmallow tone="lilac" face className="mx-auto h-14 w-14" />
            <p className="mt-4 font-display text-2xl">Nothing here just yet</p>
            <p className="mt-2 text-choc-soft">Try another colour or size — or ask us to knit exactly what you're looking for.</p>
            <Link to="/custom-orders" className="btn btn-dark mt-6">Request a custom piece</Link>
          </div>
        ) : (
          <ProductGrid products={list} priority={4} />
        )}
      </div>
    </div>
  );
}
