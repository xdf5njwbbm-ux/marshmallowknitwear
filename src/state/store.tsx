import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { addLine, changeLine, removeLine, setQty, totals } from "../lib/cart";
import type { CartLine, Category, Product, Settings } from "../lib/types";

// ---------------------------------------------------------------- catalogue + settings

const FALLBACK_SETTINGS: Settings = {
  store_name: "Marshmallow Knitwear", announcement: "Handcrafted with love • Every stitch tells a story", venmo_username: "VENMO_USERNAME",
  venmo_link: null, venmo_logo_url: null, shipping_flat_cents: 900, free_shipping_over_cents: 15000, processing_time: "2–3 weeks",
  contact_email: "hello@marshmallowknitwear.com", instagram: "marshmallowknitwear", phone: null,
  hero_heading: "Handmade With Love. Worn With Comfort.",
  hero_text: "Discover thoughtfully handcrafted knitwear designed to bring warmth, personality, and comfort to every wardrobe.",
  hero_image_women: null, hero_image_men: null, home: {},
};

type Catalog = { products: Product[]; categories: Category[]; settings: Settings; loading: boolean; error: string | null; reload: () => Promise<void> };
const CatalogCtx = createContext<Catalog | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<Catalog, "reload">>({ products: [], categories: [], settings: FALLBACK_SETTINGS, loading: true, error: null });
  const reload = useCallback(async () => {
    try {
      const c = await api.catalog();
      setState({ ...c, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  const value = useMemo(() => ({ ...state, reload }), [state, reload]);
  return <CatalogCtx.Provider value={value}>{children}</CatalogCtx.Provider>;
}

export function useCatalog() {
  const c = useContext(CatalogCtx);
  if (!c) throw new Error("CatalogProvider missing");
  return c;
}

// ---------------------------------------------------------------- the bag

type Cart = {
  lines: CartLine[];
  token: string;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (l: Omit<CartLine, "key">) => void;
  qty: (key: string, q: number) => void;
  change: (key: string, patch: { size?: string; color?: string }) => void;
  remove: (key: string) => void;
  clear: () => void;
  summary: ReturnType<typeof totals>;
};
const CartCtx = createContext<Cart | null>(null);
const KEY = "mk-bag-v1";

function loadBag(): { lines: CartLine[]; token: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v.lines) && typeof v.token === "string") return v;
    }
  } catch {
    /* private mode */
  }
  return { lines: [], token: crypto.randomUUID() };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, settings } = useCatalog();
  const [bag, setBag] = useState(loadBag);
  const [open, setOpen] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep it on this device, and (quietly) a copy for the shop's open-cart view
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(bag));
    } catch {
      /* ignore */
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      api.saveCart(bag.token, bag.lines.map(({ product_id, size, color, quantity }) => ({ product_id, size, color, quantity }))).catch(() => {});
    }, 1500);
  }, [bag]);

  // other tabs
  useEffect(() => {
    const on = (e: StorageEvent) => e.key === KEY && setBag(loadBag());
    addEventListener("storage", on);
    return () => removeEventListener("storage", on);
  }, []);

  const value = useMemo<Cart>(() => {
    const set = (f: (l: CartLine[]) => CartLine[]) => setBag((b) => ({ ...b, lines: f(b.lines) }));
    return {
      lines: bag.lines,
      token: bag.token,
      open,
      setOpen,
      add: (l) => set((x) => addLine(x, l)),
      qty: (k, q) => set((x) => setQty(x, k, q)),
      change: (k, p) => set((x) => changeLine(x, k, p)),
      remove: (k) => set((x) => removeLine(x, k)),
      clear: () => setBag({ lines: [], token: crypto.randomUUID() }),
      summary: totals(bag.lines, products, settings),
    };
  }, [bag, open, products, settings]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("CartProvider missing");
  return c;
}

// ---------------------------------------------------------------- toasts

type Toast = { id: number; text: string; tone?: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-md animate-fade-up rounded-full px-5 py-3 text-sm font-medium shadow-lift ${t.tone === "error" ? "bg-rose text-white" : "bg-choc text-cream"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
