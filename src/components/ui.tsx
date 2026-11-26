import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Star, X } from "lucide-react";
import { sized, srcSet } from "../lib/img";
import { BADGE } from "../lib/format";
import { Marshmallow } from "./Brand";

/** Responsive, lazy image that fades in, with a soft branded fallback if the photo can't load. */
export function Img({ src, alt, sizes = "100vw", className = "", priority = false, width = 960, fit = "cover" }: {
  src: string | null | undefined; alt: string; sizes?: string; className?: string; priority?: boolean; width?: number; fit?: "cover" | "contain";
}) {
  // Track which src finished loading/failed, so a cached image that loads before effects run is never hidden.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = !!src && loadedSrc === src;
  const failed = !src || failedSrc === src;
  const check = (el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0 && src) setLoadedSrc(src);
  };
  return (
    <div className={`relative overflow-hidden bg-oat ${className}`}>
      {failed ? (
        <div className="knit absolute inset-0 grid place-items-center bg-oat" role="img" aria-label={alt}>
          <Marshmallow tone="blush" className="h-14 w-14 opacity-70" />
        </div>
      ) : (
        <img
          src={sized(src, width)}
          srcSet={srcSet(src)}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          ref={check}
          onLoad={() => setLoadedSrc(src ?? null)}
          onError={() => setFailedSrc(src ?? null)}
          className={`absolute inset-0 h-full w-full transition duration-700 ${fit === "cover" ? "object-cover" : "object-contain"} ${loaded ? "scale-100 opacity-100" : "scale-[1.02] opacity-0"}`}
        />
      )}
    </div>
  );
}

/** Fades content up as it scrolls into view. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setShown(true), io.disconnect()), { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={`${className} transition duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] ${shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

export function Stars({ value, size = 14, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-caramel text-caramel" : "text-sand"} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export function BadgeChip({ badge, className = "" }: { badge: string | null; className?: string }) {
  if (!badge || !BADGE[badge]) return null;
  return <span className={`chip shadow-sm ${BADGE[badge].tone} ${className}`}>{BADGE[badge].label}</span>;
}

export function Swatch({ hex, name, active, onClick, size = 28, disabled }: { hex: string; name: string; active?: boolean; onClick?: () => void; size?: number; disabled?: boolean }) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      title={name}
      aria-label={name}
      aria-pressed={onClick ? active : undefined}
      className={`relative inline-block shrink-0 rounded-full transition ${active ? "ring-2 ring-choc ring-offset-2 ring-offset-paper" : "ring-1 ring-choc/15"} ${onClick ? "hover:scale-110" : ""} disabled:opacity-40`}
      style={{ width: size, height: size, background: hex }}
    />
  );
}

export function Qty({ value, onChange, min = 1, max = 10, small = false }: { value: number; onChange: (v: number) => void; min?: number; max?: number; small?: boolean }) {
  const h = small ? "h-9" : "h-12";
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-sand bg-paper`}>
      <button type="button" className={`grid ${h} w-10 place-items-center rounded-l-full text-choc hover:bg-oat disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus size={15} />
      </button>
      <span className="w-8 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={`grid ${h} w-10 place-items-center rounded-r-full text-choc hover:bg-oat disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus size={15} />
      </button>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-label="Loading" />;
}

/** Centered dialog (bottom sheet on phones). Locks page scroll and closes on Escape. */
export function Modal({ open, onClose, children, title, wide = false }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-[fade-up_.3s_ease_both] bg-choc/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-paper shadow-lift sm:rounded-[28px] ${wide ? "sm:max-w-4xl" : "sm:max-w-lg"} animate-fade-up`}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-paper/90 text-choc shadow-sm hover:bg-oat" aria-label="Close">
          <X size={18} />
        </button>
        {title && <h2 className="px-6 pt-6 pr-14 text-2xl">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, error, hint, children, className = "" }: { label: string; error?: string | null; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-[13px] font-medium text-rose" role="alert">{error}</span> : hint ? <span className="mt-1.5 block text-[12.5px] text-choc-soft">{hint}</span> : null}
    </label>
  );
}

export function SectionHead({ eyebrow, title, children, center = false }: { eyebrow?: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={`mb-8 sm:mb-10 ${center ? "mx-auto max-w-2xl text-center" : "flex flex-wrap items-end justify-between gap-4"}`}>
      <div>
        {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
        <h2 className="text-[32px] leading-[1.1] sm:text-[42px]">{title}</h2>
      </div>
      {children}
    </div>
  );
}
