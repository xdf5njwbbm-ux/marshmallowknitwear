import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { api } from "../lib/api";
import { friendly } from "../lib/supabase";
import type { Product, Review } from "../lib/types";
import { date } from "../lib/format";
import { useToast } from "../state/store";
import { Field, Img, Spinner, Stars } from "./ui";

export function ReviewCard({ r, product }: { r: Review; product?: Product }) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <Stars value={r.rating} />
        {r.is_sample && <span className="chip bg-butter text-cocoa" title="This is placeholder content, not a real customer review">Sample review</span>}
      </div>
      {r.title && <h3 className="mt-4 font-display text-[19px] leading-snug">{r.title.replace(/^Sample review:\s*/i, "")}</h3>}
      <Quote size={18} className="mt-3 text-blush-deep" />
      <blockquote className="mt-1 flex-1 text-[15px] leading-relaxed text-choc/80">{r.body}</blockquote>
      {r.photo_url && <Img src={r.photo_url} alt={r.is_sample ? "Sample photo" : `Photo from ${r.name}`} className="mt-4 aspect-[4/3] rounded-2xl" width={600} sizes="(min-width:768px) 30vw, 90vw" />}
      <figcaption className="mt-5 flex items-center gap-3 border-t border-beige/70 pt-4">
        <span className="grid size-10 place-items-center rounded-full bg-oat font-display text-lg text-cocoa">{r.name[0]}</span>
        <span className="min-w-0 text-[13.5px] leading-tight">
          <span className="block font-semibold">{r.name}</span>
          <span className="block truncate text-choc-soft">
            {product ? <Link to={`/product/${product.slug}`} className="hover:underline">{product.name}</Link> : r.location}
            {!r.is_sample && ` · ${date(r.created_at)}`}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Reviews for one product, plus a form; new reviews wait for the shop's approval. */
export function ProductReviews({ product }: { product: Product }) {
  const [list, setList] = useState<Review[] | null>(null);
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    api.reviews(product.id).then(setList).catch(() => setList([]));
  }, [product.id]);
  const real = (list ?? []).filter((r) => !r.is_sample);
  const avg = real.length ? real.reduce((a, r) => a + r.rating, 0) / real.length : 0;
  return (
    <section id="reviews" className="wrap pt-20 sm:pt-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-3">Reviews</div>
          <h2 className="text-[32px] sm:text-[40px]">What people say</h2>
          {real.length > 0 ? (
            <p className="mt-2 flex items-center gap-2 text-choc-soft"><Stars value={avg} /> {avg.toFixed(1)} from {real.length} review{real.length === 1 ? "" : "s"}</p>
          ) : (
            <p className="mt-2 text-choc-soft">No customer reviews yet{list?.some((r) => r.is_sample) ? " — the card below is a sample showing the layout." : "."}</p>
          )}
        </div>
        <button onClick={() => setWriting(!writing)} className="btn btn-light min-h-11">{writing ? "Close" : "Write a review"}</button>
      </div>
      {writing && <ReviewForm product={product} onDone={() => setWriting(false)} />}
      {list === null ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-[var(--radius-soft)]" />)}</div>
      ) : list.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">{list.map((r) => <ReviewCard key={r.id} r={r} />)}</div>
      ) : null}
    </section>
  );
}

function ReviewForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", rating: 0, title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = "Please enter your name.";
    if (!f.rating) er.rating = "Please choose a star rating.";
    if (f.body.trim().length < 10) er.body = "Please write a few words (at least 10 characters).";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.submitReview({ product_id: product.id, ...f });
      toast("Thank you! Your review will appear once it's approved.");
      onDone();
    } catch (x) {
      toast(friendly(x), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card mb-8 grid gap-5 p-6 sm:grid-cols-2 sm:p-8" noValidate>
      <Field label="Your name" error={err.name}>
        <input className={`field ${err.name ? "field-error" : ""}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} autoComplete="given-name" />
      </Field>
      <div>
        <span className="label">Rating</span>
        <div className="flex h-[50px] items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={f.rating === n} onClick={() => setF({ ...f, rating: n })} className="p-1" aria-label={`${n} star${n > 1 ? "s" : ""}`}>
              <svg viewBox="0 0 24 24" className={`size-8 ${n <= f.rating ? "fill-caramel text-caramel" : "fill-none text-sand"}`} stroke="currentColor" strokeWidth="1.5"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg>
            </button>
          ))}
        </div>
        {err.rating && <span className="mt-1.5 block text-[13px] font-medium text-rose">{err.rating}</span>}
      </div>
      <Field label="Headline (optional)" className="sm:col-span-2">
        <input className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} />
      </Field>
      <Field label="Your review" error={err.body} className="sm:col-span-2">
        <textarea className={`field min-h-32 ${err.body ? "field-error" : ""}`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={2000} />
      </Field>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button className="btn btn-dark" disabled={busy}>{busy ? <Spinner /> : "Submit review"}</button>
        <span className="text-[13px] text-choc-soft">Reviews are checked before they're published.</span>
      </div>
    </form>
  );
}
