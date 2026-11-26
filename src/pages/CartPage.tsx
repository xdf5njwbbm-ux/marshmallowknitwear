import { Link } from "react-router-dom";
import { ArrowRight, Lock, Trash2 } from "lucide-react";
import { useCart, useCatalog } from "../state/store";
import { useMeta } from "../lib/seo";
import { money } from "../lib/format";
import { isAvailable, unitPrice } from "../lib/cart";
import { CardiganIcon } from "../components/Brand";
import { Img, Qty } from "../components/ui";

export default function CartPage() {
  const cart = useCart();
  const { products, settings } = useCatalog();
  const { subtotal, shipping, total, problems, count } = cart.summary;
  useMeta({ title: "Your bag", noindex: true });
  const free = settings.free_shipping_over_cents;

  if (!cart.lines.length) {
    return (
      <div className="wrap grid min-h-[55vh] place-items-center py-16 text-center">
        <div>
          <CardiganIcon className="mx-auto size-20 text-sand" />
          <h1 className="mt-4 text-[40px]">Your bag is empty</h1>
          <p className="mt-2 text-choc-soft">Let's find you something soft and cosy.</p>
          <Link to="/shop" className="btn btn-dark mt-7">Shop cardigans <ArrowRight size={17} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-[40px] sm:text-[52px]">Your bag <span className="font-sans text-xl text-choc-soft">({count})</span></h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-beige border-y border-beige">
          {cart.lines.map((l) => {
            const p = products.find((x) => x.id === l.product_id);
            const img = p?.images.find((i) => i.color === l.color) ?? p?.images[0];
            const bad = problems.includes(l.key);
            return (
              <li key={l.key} className="grid grid-cols-[100px_1fr] gap-5 py-6 sm:grid-cols-[130px_1fr]">
                <Link to={`/product/${l.slug}`}><Img src={img?.url} alt={p?.name ?? "Item"} className="aspect-[4/5] rounded-2xl" width={320} sizes="130px" /></Link>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link to={`/product/${l.slug}`} className="font-display text-[21px] leading-snug">{p?.name ?? "Unavailable item"}</Link>
                      {p && <div className="mt-1 text-[14px] text-choc-soft">{money(unitPrice(p, l.size, l.color))} each</div>}
                    </div>
                    <div className="text-[17px] font-semibold">{p ? money(unitPrice(p, l.size, l.color) * l.quantity) : "—"}</div>
                  </div>
                  {p && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <label className="text-[12.5px] font-semibold">Colour
                        <select value={l.color} onChange={(e) => cart.change(l.key, { color: e.target.value })} className="mt-1 block rounded-xl border border-sand bg-paper py-2 pr-8 pl-3 text-[14px] font-normal">
                          {p.colors.map((c) => <option key={c.name}>{c.name}</option>)}
                        </select>
                      </label>
                      <label className="text-[12.5px] font-semibold">Size
                        <select value={l.size} onChange={(e) => cart.change(l.key, { size: e.target.value })} className="mt-1 block rounded-xl border border-sand bg-paper py-2 pr-8 pl-3 text-[14px] font-normal">
                          {p.sizes.map((s) => <option key={s} disabled={!isAvailable(p, s, l.color)}>{s}</option>)}
                        </select>
                      </label>
                    </div>
                  )}
                  {bad && <p className="mt-3 text-[13.5px] font-medium text-rose">{p ? "This size/colour is sold out — please choose another." : "This item is no longer available — please remove it."}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <Qty small value={l.quantity} onChange={(q) => cart.qty(l.key, q)} />
                    <button onClick={() => cart.remove(l.key)} className="inline-flex items-center gap-1.5 text-[13.5px] text-choc-soft hover:text-rose"><Trash2 size={16} /> Remove</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="card h-fit p-6 lg:sticky lg:top-[150px]">
          <h2 className="text-2xl">Order summary</h2>
          <dl className="mt-5 grid gap-2.5 text-[15px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : money(shipping)}</dd></div>
            {free != null && subtotal < free && <div className="rounded-xl bg-blush/40 px-3 py-2 text-[13px]">Add {money(free - subtotal)} more for free shipping.</div>}
            <div className="mt-2 flex justify-between border-t border-beige pt-3 text-xl"><dt className="font-display">Total</dt><dd className="font-semibold">{money(total)}</dd></div>
          </dl>
          <Link to="/checkout" onClick={(e) => problems.length && e.preventDefault()} className={`btn btn-dark mt-6 w-full ${problems.length ? "pointer-events-none opacity-50" : ""}`}>
            <Lock size={16} /> Checkout
          </Link>
          <p className="mt-3 text-center text-[13px] text-choc-soft">Secure checkout · pay with Venmo</p>
          <Link to="/shop" className="btn-link mt-5 w-full justify-center">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
