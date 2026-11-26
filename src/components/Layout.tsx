import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Camera as Instagram, Lock, Mail, Menu, ShoppingBag, Trash2, Truck, UserRound, X } from "lucide-react";
import { useCart, useCatalog } from "../state/store";
import { money } from "../lib/format";
import { isAvailable, unitPrice } from "../lib/cart";
import { CardiganIcon, Logo, Marshmallow } from "./Brand";
import { Img, Qty } from "./ui";

export const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Home", end: true },
  { to: "/shop", label: "Shop All", end: true },
  { to: "/shop/women", label: "Women's Cardigans" },
  { to: "/shop/men", label: "Men's Cardigans" },
  { to: "/custom-orders", label: "Custom Orders" },
  { to: "/our-story", label: "Our Story" },
  { to: "/contact", label: "Contact" },
];

function Announcement() {
  const { settings } = useCatalog();
  const parts = settings.announcement.split("•").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="bg-choc text-cream">
      <div className="wrap flex h-9 items-center justify-center gap-2 overflow-hidden text-[10px] font-medium tracking-[0.1em] whitespace-nowrap uppercase sm:gap-3 sm:text-[12px] sm:tracking-[0.18em]">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && <span className="inline-block size-1.5 rounded-full bg-blush" aria-hidden="true" />}
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function Header() {
  const cart = useCart();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 8);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);
  const count = cart.summary.count;
  return (
    <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled ? "border-beige/80 bg-cream/90 backdrop-blur-md" : "border-transparent bg-cream"}`}>
      <div className="wrap grid h-[72px] grid-cols-[1fr_auto_1fr] items-center lg:h-[84px]">
        <div className="flex items-center">
          <button className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-oat lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <Link to="/track" className="hidden items-center gap-1.5 text-[13px] font-medium text-choc-soft hover:text-choc lg:inline-flex">
            <Truck size={16} /> Track your order
          </Link>
        </div>
        <Logo />
        <div className="flex items-center justify-end gap-1">
          <Link to="/account" className="grid size-11 place-items-center rounded-full hover:bg-oat" aria-label="Account and orders">
            <UserRound size={21} />
          </Link>
          <button onClick={() => cart.setOpen(true)} className="relative -mr-2 grid size-11 place-items-center rounded-full hover:bg-oat" aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}>
            <ShoppingBag size={21} />
            {count > 0 && <span className="absolute top-1 right-0.5 grid min-w-5 place-items-center rounded-full bg-blush-deep px-1 text-[11px] leading-5 font-bold text-white">{count}</span>}
          </button>
        </div>
      </div>
      <nav className="hidden border-t border-beige/60 lg:block" aria-label="Main">
        <ul className="wrap flex h-12 items-center justify-center gap-9">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end} className={({ isActive }) => `relative py-3 text-[13px] font-semibold tracking-[0.12em] uppercase transition after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:origin-left after:bg-choc after:transition-transform ${isActive ? "text-choc after:scale-x-100" : "text-choc-soft after:scale-x-0 hover:text-choc hover:after:scale-x-100"}`}>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-choc/40" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-[fade-up_.35s_ease_both] flex-col bg-cream shadow-lift">
            <div className="flex h-[72px] items-center justify-between border-b border-beige px-5">
              <Logo />
              <button className="grid size-11 place-items-center rounded-full hover:bg-oat" onClick={() => setMenu(false)} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto px-5 py-4">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.end} className={({ isActive }) => `flex items-center justify-between border-b border-beige/60 py-4 font-display text-[22px] ${isActive ? "text-choc" : "text-choc/80"}`}>
                    {n.label} <ArrowRight size={18} className="text-choc-soft" />
                  </NavLink>
                </li>
              ))}
              <li className="mt-6 grid gap-3 text-[15px]">
                <Link to="/track" className="flex items-center gap-2"><Truck size={18} /> Track your order</Link>
                <Link to="/account" className="flex items-center gap-2"><UserRound size={18} /> Account</Link>
              </li>
            </ul>
            <div className="knit flex items-center gap-3 border-t border-beige bg-oat px-5 py-4 text-[13px] text-choc-soft">
              <Marshmallow tone="sage" className="h-8 w-8" /> Every piece is knitted by hand, just for you.
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function CartDrawer() {
  const cart = useCart();
  const { products, settings } = useCatalog();
  const { subtotal, shipping, total, problems } = cart.summary;
  const free = settings.free_shipping_over_cents;
  const loc = useLocation();
  useEffect(() => cart.setOpen(false), [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cart.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.setOpen(false);
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [cart.open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cart.open) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Your bag">
      <div className="absolute inset-0 animate-[fade-up_.25s_ease_both] bg-choc/40 backdrop-blur-[1px]" onClick={() => cart.setOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-cream shadow-lift" style={{ animation: "fade-up .4s cubic-bezier(.22,1,.36,1) both" }}>
        <div className="flex h-[72px] items-center justify-between border-b border-beige px-6">
          <h2 className="text-2xl">Your bag <span className="font-sans text-base font-normal text-choc-soft">({cart.summary.count})</span></h2>
          <button className="grid size-11 place-items-center rounded-full hover:bg-oat" onClick={() => cart.setOpen(false)} aria-label="Close bag">
            <X size={22} />
          </button>
        </div>
        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <CardiganIcon className="size-16 text-sand" />
            <p className="mt-4 font-display text-2xl">Your bag is empty</p>
            <p className="mt-2 text-choc-soft">Let's find you something cosy.</p>
            <Link to="/shop" className="btn btn-dark mt-6">Shop cardigans</Link>
          </div>
        ) : (
          <>
            {free != null && (
              <div className="border-b border-beige px-6 py-3.5 text-[13.5px]">
                {subtotal >= free ? (
                  <span className="font-semibold text-sage-deep">You've got free shipping ✿</span>
                ) : (
                  <span>You're <b>{money(free - subtotal)}</b> away from free shipping</span>
                )}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-oat">
                  <div className="h-full rounded-full bg-blush-deep transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / free) * 100)}%` }} />
                </div>
              </div>
            )}
            <ul className="flex-1 divide-y divide-beige/70 overflow-y-auto px-6">
              {cart.lines.map((l) => {
                const p = products.find((x) => x.id === l.product_id);
                const img = p?.images.find((i) => i.color === l.color) ?? p?.images[0];
                const bad = problems.includes(l.key);
                return (
                  <li key={l.key} className="flex gap-4 py-5">
                    <Link to={`/product/${l.slug}`} className="shrink-0">
                      <Img src={img?.url} alt={p?.name ?? "Item"} className="h-28 w-[88px] rounded-2xl" width={240} sizes="88px" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/product/${l.slug}`} className="font-display text-[17px] leading-snug">{p?.name ?? "Unavailable item"}</Link>
                        <span className="shrink-0 font-semibold">{p ? money(unitPrice(p, l.size, l.color) * l.quantity) : "—"}</span>
                      </div>
                      {p && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select value={l.color} onChange={(e) => cart.change(l.key, { color: e.target.value })} className="rounded-lg border border-sand bg-paper py-1.5 pr-7 pl-2.5 text-[13px]" aria-label="Colour">
                            {p.colors.map((c) => <option key={c.name}>{c.name}</option>)}
                          </select>
                          <select value={l.size} onChange={(e) => cart.change(l.key, { size: e.target.value })} className="rounded-lg border border-sand bg-paper py-1.5 pr-7 pl-2.5 text-[13px]" aria-label="Size">
                            {p.sizes.map((s) => <option key={s} disabled={!isAvailable(p, s, l.color)}>{s}</option>)}
                          </select>
                        </div>
                      )}
                      {bad && <p className="mt-2 text-[13px] font-medium text-rose">{p ? "This choice is sold out — pick another size or colour." : "No longer available — please remove it."}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <Qty small value={l.quantity} onChange={(q) => cart.qty(l.key, q)} />
                        <button onClick={() => cart.remove(l.key)} className="inline-flex items-center gap-1 text-[13px] text-choc-soft hover:text-rose" aria-label={`Remove ${p?.name ?? "item"}`}>
                          <Trash2 size={15} /> Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-beige bg-paper px-6 py-5">
              <dl className="grid gap-1.5 text-[15px]">
                <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : money(shipping)}</dd></div>
                <div className="mt-1 flex justify-between border-t border-beige pt-2.5 text-lg"><dt className="font-display">Total</dt><dd className="font-semibold">{money(total)}</dd></div>
              </dl>
              <Link to="/checkout" aria-disabled={problems.length > 0} onClick={(e) => problems.length && e.preventDefault()} className={`btn btn-dark mt-4 w-full ${problems.length ? "pointer-events-none opacity-50" : ""}`}>
                <Lock size={16} /> Checkout
              </Link>
              <div className="mt-3 flex items-center justify-between text-[13px]">
                <Link to="/cart" className="btn-link">View bag</Link>
                <span className="text-choc-soft">Pay securely with Venmo</span>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Footer() {
  const { settings } = useCatalog();
  const ig = settings.instagram.replace(/^@/, "");
  return (
    <footer className="mt-24 bg-choc text-cream/85">
      <div className="wrap grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="font-display text-[30px] text-cream" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>Marshmallow</div>
          <div className="mt-1 text-[10.5px] font-semibold tracking-[0.52em] text-cream/60">KNITWEAR</div>
          <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-cream/70">Handmade cardigans for women and men, knitted slowly and with love — so every piece is a little bit one of a kind.</p>
          <div className="mt-6 flex gap-3">
            <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-full border border-cream/20 hover:bg-cream/10" aria-label="Instagram">
              <Instagram size={19} />
            </a>
            <a href={`mailto:${settings.contact_email}`} className="grid size-11 place-items-center rounded-full border border-cream/20 hover:bg-cream/10" aria-label="Email us">
              <Mail size={19} />
            </a>
          </div>
        </div>
        <FooterCol title="Shop" links={[["/shop", "Shop All"], ["/shop/women", "Women's Cardigans"], ["/shop/men", "Men's Cardigans"], ["/shop/couples", "Matching Couple Cardigans"], ["/custom-orders", "Custom Orders"]]} />
        <FooterCol title="Help" links={[["/contact", "Contact"], ["/track", "Track Your Order"], ["/policies/shipping", "Shipping Policy"], ["/policies/returns", "Returns Policy"], ["/contact#faq", "FAQ"]]} />
        <FooterCol title="About" links={[["/our-story", "About Us"], ["/policies/privacy", "Privacy Policy"], ["/policies/terms", "Terms of Service"], [`https://instagram.com/${ig}`, "Instagram"]]} />
      </div>
      <div className="border-t border-cream/10">
        <div className="wrap flex flex-col items-center justify-between gap-3 py-6 text-[13px] text-cream/55 sm:flex-row">
          <span>© {new Date().getFullYear()} Marshmallow Knitwear. All rights reserved.</span>
          <span className="flex items-center gap-2">Handcrafted with love <Marshmallow tone="blush" className="h-5 w-5" /> every stitch tells a story</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="font-sans text-[12px] font-semibold tracking-[0.2em] text-cream uppercase">{title}</h3>
      <ul className="mt-5 grid gap-3 text-[15px]">
        {links.map(([to, label]) =>
          to.startsWith("http") ? (
            <li key={to}><a href={to} target="_blank" rel="noreferrer" className="hover:text-cream">{label}</a></li>
          ) : (
            <li key={to}><Link to={to} className="hover:text-cream">{label}</Link></li>
          ),
        )}
      </ul>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) {
      const el = document.getElementById(loc.hash.slice(1));
      if (el) return void setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 80);
    }
    scrollTo({ top: 0 });
  }, [loc.pathname, loc.hash]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:rounded-full focus:bg-choc focus:px-4 focus:py-2 focus:text-cream">Skip to content</a>
      <Announcement />
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
