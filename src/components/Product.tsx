import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Ruler, ShoppingBag } from "lucide-react";
import type { Product } from "../lib/types";
import { money } from "../lib/format";
import { isAvailable, unitPrice } from "../lib/cart";
import { useCart, useCatalog, useToast } from "../state/store";
import { BadgeChip, Img, Modal, Qty, Swatch } from "./ui";

export const SIZE_GUIDE: [string, string, string, string][] = [
  ["XS", "32–33\"", "26\"", "4"],
  ["S", "34–35\"", "26.5\"", "6–8"],
  ["M", "36–38\"", "27\"", "10–12"],
  ["L", "39–41\"", "27.5\"", "14–16"],
  ["XL", "42–44\"", "28\"", "18–20"],
  ["XXL", "45–48\"", "28.5\"", "22–24"],
];

export function SizeGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Size guide">
      <div className="px-6 pt-2 pb-6">
        <p className="text-[15px] text-choc-soft">Measurements are for your body. Our oversized styles are knitted with 6–8" of extra room — size down for a closer fit. Not sure? Order a custom size and we'll knit to your measurements.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-beige">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-oat text-[12px] tracking-wider text-choc-soft uppercase">
              <tr><th className="px-4 py-2.5">Size</th><th className="px-4 py-2.5">Chest</th><th className="px-4 py-2.5">Length</th><th className="px-4 py-2.5">US women's</th></tr>
            </thead>
            <tbody>
              {SIZE_GUIDE.map(([s, chest, len, us]) => (
                <tr key={s} className="border-t border-beige/70"><td className="px-4 py-2.5 font-semibold">{s}</td><td className="px-4 py-2.5">{chest}</td><td className="px-4 py-2.5">{len}</td><td className="px-4 py-2.5">{us}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/custom-orders" onClick={onClose} className="btn-link mt-4">Need custom sizing? Request a made-to-measure piece</Link>
      </div>
    </Modal>
  );
}

/** Colour, size and quantity pickers, shared by the product page and quick view. */
export function Options({ p, color, setColor, size, setSize, qty, setQty, sizeError }: {
  p: Product; color: string; setColor: (c: string) => void; size: string; setSize: (s: string) => void; qty: number; setQty: (q: number) => void; sizeError?: boolean;
}) {
  const [guide, setGuide] = useState(false);
  return (
    <div className="grid gap-6">
      <div>
        <div className="mb-2.5 text-[13px] font-semibold">Colour: <span className="font-normal text-choc-soft">{color}</span></div>
        <div className="flex flex-wrap gap-3">
          {p.colors.map((c) => <Swatch key={c.name} hex={c.hex} name={c.name} active={c.name === color} onClick={() => setColor(c.name)} size={32} />)}
        </div>
      </div>
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className={`text-[13px] font-semibold ${sizeError ? "text-rose" : ""}`}>{sizeError ? "Please choose a size" : <>Size{size && <span className="font-normal text-choc-soft">: {size}</span>}</>}</span>
          <button type="button" onClick={() => setGuide(true)} className="inline-flex items-center gap-1 text-[13px] font-medium text-choc-soft underline underline-offset-4 hover:text-choc">
            <Ruler size={14} /> Size guide
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Size">
          {p.sizes.map((s) => {
            const ok = isAvailable(p, s, color);
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                disabled={!ok}
                onClick={() => setSize(s)}
                className={`h-11 rounded-xl border text-[14px] font-semibold transition ${size === s ? "border-choc bg-choc text-cream" : "border-sand bg-paper hover:border-choc"} ${sizeError && !size ? "border-rose" : ""} disabled:cursor-not-allowed disabled:border-beige disabled:text-sand disabled:line-through`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-2.5 text-[13px] font-semibold">Quantity</div>
        <Qty value={qty} onChange={setQty} />
      </div>
      <SizeGuide open={guide} onClose={() => setGuide(false)} />
    </div>
  );
}

export function useAddToBag(p: Product | null) {
  const cart = useCart();
  const toast = useToast();
  const [color, setColor] = useState(p?.colors[0]?.name ?? "");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  useEffect(() => {
    setColor(p?.colors[0]?.name ?? "");
    setSize("");
    setQty(1);
    setSizeError(false);
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (size && p && !isAvailable(p, size, color)) setSize("");
  }, [color]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = () => {
    if (!p) return false;
    if (!size) {
      setSizeError(true);
      return false;
    }
    cart.add({ product_id: p.id, slug: p.slug, size, color, quantity: qty });
    toast(`Added to your bag — ${p.name}`);
    cart.setOpen(true);
    return true;
  };
  return { color, setColor, size, setSize: (s: string) => (setSize(s), setSizeError(false)), qty, setQty, sizeError, add, price: p ? unitPrice(p, size || p.sizes[0], color) : 0 };
}

export function Price({ p, className = "" }: { p: Product; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span>{money(p.price_cents)}</span>
      {p.compare_at_cents && p.compare_at_cents > p.price_cents && <span className="text-[0.85em] text-choc-soft line-through">{money(p.compare_at_cents)}</span>}
    </span>
  );
}

export function ProductCard({ p, onQuick, priority = false }: { p: Product; onQuick: (p: Product) => void; priority?: boolean }) {
  const [a, b] = p.images;
  return (
    <article className="group relative flex flex-col">
      <Link to={`/product/${p.slug}`} className="relative block overflow-hidden rounded-[22px]" aria-label={p.name}>
        <Img src={a?.url} alt={a?.alt || p.name} className="aspect-[4/5] w-full" sizes="(min-width:1024px) 23vw, (min-width:640px) 45vw, 48vw" width={720} priority={priority} />
        {b && (
          <Img src={b.url} alt="" className="!absolute inset-0 aspect-[4/5] w-full opacity-0 transition duration-700 group-hover:opacity-100" sizes="(min-width:1024px) 23vw, 48vw" width={720} />
        )}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {p.sold_out ? <span className="chip bg-choc text-cream">Sold out</span> : <BadgeChip badge={p.badge} />}
        </div>
      </Link>
      <div className="mt-3.5 flex flex-1 flex-col px-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] leading-snug sm:text-[19px]">
            <Link to={`/product/${p.slug}`} className="hover:underline hover:decoration-choc/30 hover:underline-offset-4">{p.name}</Link>
          </h3>
          <Price p={p} className="shrink-0 pt-0.5 text-[15px] font-semibold" />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {p.colors.slice(0, 5).map((c) => <Swatch key={c.name} hex={c.hex} name={c.name} size={16} />)}
          <span className="ml-1 text-[12.5px] text-choc-soft">{p.colors.length > 1 ? `${p.colors.length} colours` : p.colors[0]?.name}</span>
        </div>
        <div className="mt-3.5 grid grid-cols-[auto_1fr] gap-2">
          <button type="button" onClick={() => onQuick(p)} className="grid size-11 place-items-center rounded-full border border-sand bg-paper text-choc transition hover:border-choc" aria-label={`Quick view: ${p.name}`} title="Quick view">
            <Eye size={18} />
          </button>
          <button type="button" disabled={p.sold_out} onClick={() => onQuick(p)} className="btn btn-dark min-h-11 px-4 text-[14px]">
            <ShoppingBag size={16} /> {p.sold_out ? "Sold out" : "Add to bag"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function QuickView({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const o = useAddToBag(p);
  const [img, setImg] = useState(0);
  useEffect(() => setImg(0), [p?.id]);
  if (!p) return null;
  return (
    <Modal open={!!p} onClose={onClose} wide title={undefined}>
      <div className="grid sm:grid-cols-2">
        <div className="p-3 sm:p-4">
          <Img src={p.images[img]?.url} alt={p.images[img]?.alt || p.name} className="aspect-[4/5] rounded-[22px]" sizes="(min-width:640px) 420px, 100vw" width={960} priority />
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((im, i) => (
                <button key={im.url} onClick={() => setImg(i)} className={`overflow-hidden rounded-xl ring-offset-2 ring-offset-paper ${i === img ? "ring-2 ring-choc" : "opacity-70 hover:opacity-100"}`} aria-label={`Photo ${i + 1}`}>
                  <Img src={im.url} alt="" className="size-16" width={160} sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col p-6 pt-2 sm:pt-10">
          <BadgeChip badge={p.badge} className="mb-3 self-start" />
          <h2 className="text-[30px] leading-tight">{p.name}</h2>
          <p className="mt-1 text-choc-soft">{p.subtitle}</p>
          <Price p={p} className="mt-3 text-xl font-semibold" />
          <div className="mt-6">
            <Options p={p} color={o.color} setColor={o.setColor} size={o.size} setSize={o.setSize} qty={o.qty} setQty={o.setQty} sizeError={o.sizeError} />
          </div>
          <button type="button" disabled={p.sold_out} onClick={() => o.add() && onClose()} className="btn btn-dark mt-7 w-full">
            <ShoppingBag size={18} /> {p.sold_out ? "Sold out" : `Add to bag — ${money(o.price * o.qty)}`}
          </button>
          <Link to={`/product/${p.slug}`} onClick={onClose} className="btn-link mt-4 self-center">View full details</Link>
        </div>
      </div>
    </Modal>
  );
}

/** Grid of product cards with a shared quick view. */
export function ProductGrid({ products, priority = 0 }: { products: Product[]; priority?: number }) {
  const [quick, setQuick] = useState<Product | null>(null);
  const { loading } = useCatalog();
  if (loading && !products.length) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5] rounded-[22px]" />
            <div className="skeleton mt-4 h-4 w-3/4 rounded" />
            <div className="skeleton mt-2 h-4 w-1/3 rounded" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {products.map((p, i) => <ProductCard key={p.id} p={p} onQuick={setQuick} priority={i < priority} />)}
      </div>
      <QuickView p={quick} onClose={() => setQuick(null)} />
    </>
  );
}
