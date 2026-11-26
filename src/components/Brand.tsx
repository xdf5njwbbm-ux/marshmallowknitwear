import { Link } from "react-router-dom";

const FILLS: Record<string, string> = { blush: "#F4CFCA", sky: "#D3E3EF", sage: "#D3DEC6", butter: "#F6E9BE", lilac: "#E2D9EE", cream: "#FBF3E6" };

/** A soft little marshmallow, drawn after the brand poster. `face` adds the sleepy smile. */
export function Marshmallow({ tone = "blush", face = false, className = "", style }: { tone?: keyof typeof FILLS; face?: boolean; className?: string; style?: React.CSSProperties }) {
  const f = FILLS[tone];
  return (
    <svg viewBox="0 0 64 60" className={className} style={style} aria-hidden="true">
      <path d="M8 18c0-6 11-10 24-10s24 4 24 10v24c0 6-11 10-24 10S8 48 8 42z" fill={f} stroke="#6B4A3A" strokeOpacity=".55" strokeWidth="1.6" />
      <ellipse cx="32" cy="18" rx="24" ry="9.5" fill="#fff" fillOpacity=".55" stroke="#6B4A3A" strokeOpacity=".4" strokeWidth="1.4" />
      <path d="M14 26c.5 7 .5 13 0 18" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" fill="none" />
      {face && (
        <g stroke="#4A3024" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M24 33c1.5 1.4 3 1.4 4.5 0M36 33c1.5 1.4 3 1.4 4.5 0" />
          <path d="M30 39c1.3 1.2 2.7 1.2 4 0" />
          <circle cx="21" cy="38" r="2.6" fill="#EBA9A1" stroke="none" opacity=".6" />
          <circle cx="43" cy="38" r="2.6" fill="#EBA9A1" stroke="none" opacity=".6" />
        </g>
      )}
    </svg>
  );
}

/** Wordmark: an editorial serif "Marshmallow" with tracked "KNITWEAR". */
export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Marshmallow Knitwear — home">
      {!compact && <Marshmallow tone="blush" className="h-8 w-8 shrink-0 transition duration-500 group-hover:-rotate-12 sm:h-9 sm:w-9" />}
      <span className="flex flex-col items-start leading-none">
        <span className="font-display text-[23px] font-medium tracking-[-0.015em] text-choc sm:text-[27px]" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
          Marshmallow
        </span>
        <span className="mt-1 pl-[2px] text-[9.5px] font-semibold tracking-[0.52em] text-choc-soft sm:text-[10.5px]">KNITWEAR</span>
      </span>
    </Link>
  );
}

/** A cardigan line drawing (for empty states and small decorations). */
export function CardiganIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M24 8l8 10 8-10" />
      <path d="M24 8l-12 5-6 22 7 3 4-12v30h12V18M40 8l12 5 6 22-7 3-4-12v30H35V18" />
      <circle cx="29" cy="30" r="1.2" fill="currentColor" />
      <circle cx="29" cy="38" r="1.2" fill="currentColor" />
      <circle cx="29" cy="46" r="1.2" fill="currentColor" />
      <path d="M17 50h12M35 50h12" strokeOpacity=".5" />
    </svg>
  );
}
