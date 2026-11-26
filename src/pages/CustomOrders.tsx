import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ImagePlus, MessageCircleHeart, Ruler, Sparkles, X } from "lucide-react";
import { api } from "../lib/api";
import { friendly } from "../lib/supabase";
import { shrinkImage } from "../lib/img";
import { useMeta } from "../lib/seo";
import { useCatalog } from "../state/store";
import { Field, Img, Spinner } from "../components/ui";
import { Marshmallow } from "../components/Brand";

const STYLES = ["Classic cardigan", "Oversized cardigan", "Cropped cardigan", "Chunky knit cardigan", "Matching couple set", "Something else"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Custom measurements"];
const FITS = ["Fitted", "Relaxed", "Oversized"];
const MAX_FILES = 4;
const MAX_BYTES = 8 * 1024 * 1024;

type Form = { name: string; email: string; style: string; color: string; size: string; fit: string; couple: boolean; description: string };
const EMPTY: Form = { name: "", email: "", style: "", color: "", size: "", fit: "", couple: false, description: "" };

export default function CustomOrders() {
  useMeta({
    title: "Custom Orders",
    description: "Request a one-of-a-kind handmade cardigan — choose the style, colours and size, share reference photos, and we'll send you a personal quote.",
    path: "/custom-orders",
  });
  const { products } = useCatalog();
  const [f, setF] = useState<Form>(EMPTY);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "files", string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((o) => ({ ...o, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  useEffect(() => () => files.forEach((x) => URL.revokeObjectURL(x.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    let err: string | undefined;
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) { err = `You can add up to ${MAX_FILES} photos.`; break; }
      if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) { err = "Please choose image files (JPG, PNG, WebP or HEIC)."; continue; }
      if (file.size > 25 * 1024 * 1024) { err = `${file.name} is too large.`; continue; }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setFiles(next);
    setErrors((e) => ({ ...e, files: err }));
    if (input.current) input.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    if (f.name.trim().length < 2) er.name = "Please enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim())) er.email = "Please enter a valid email address.";
    if (!f.style) er.style = "Please choose a style.";
    if (f.description.trim().length < 10) er.description = "Tell us a little more about your idea (at least a sentence).";
    setErrors(er);
    if (Object.keys(er).length) {
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setFail(null);
    try {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${files.length}…`);
        const small = await shrinkImage(files[i].file);
        if (small.size > MAX_BYTES) throw new Error(`${files[i].file.name} is too large — please use a photo under 8 MB.`);
        paths.push(await api.uploadRequestImage(small));
      }
      setBusy("Sending your request…");
      await api.submitCustomRequest({ ...f, name: f.name.trim(), email: f.email.trim(), image_paths: paths });
      setDone(true);
      scrollTo({ top: 0, behavior: "smooth" });
    } catch (x) {
      setFail(friendly(x));
    } finally {
      setBusy(null);
    }
  };

  const pics = products.flatMap((p) => p.images.slice(0, 1)).slice(3, 6);

  if (done) {
    return (
      <div className="wrap max-w-2xl py-20 text-center">
        <CheckCircle2 size={44} className="mx-auto text-sage-deep" />
        <h1 className="mt-5 text-[40px] leading-tight">Thank you, {f.name.trim().split(" ")[0]}!</h1>
        <p className="mt-4 text-[17px] text-choc-soft">
          Your custom request is in. We'll review your idea personally and email <b className="text-choc">{f.email.trim()}</b> with questions, a final price and a payment request. Nothing is charged until you approve the quote.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn btn-dark">Browse the shop</Link>
          <button className="btn btn-light" onClick={() => { setF(EMPTY); setFiles([]); setDone(false); }}>Send another request</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-oat/60">
        <div className="wrap grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <div className="eyebrow">Custom orders</div>
            <h1 className="mt-3 text-[42px] leading-[1.05] sm:text-[58px]">A cardigan made <i className="text-cocoa">just for you.</i></h1>
            <p className="mt-5 max-w-lg text-[17px] text-choc-soft">Dream up the colours, the fit and the little details. Share a few reference photos and we'll knit something that's entirely yours — or a matching pair for two.</p>
            <ul className="mt-8 grid gap-4 text-[15px] sm:grid-cols-3">
              <li className="flex gap-3 sm:flex-col"><MessageCircleHeart className="shrink-0 text-cocoa" /> <span><b>1. Tell us your idea</b><br /><span className="text-choc-soft">Style, colours, size and photos.</span></span></li>
              <li className="flex gap-3 sm:flex-col"><Sparkles className="shrink-0 text-cocoa" /> <span><b>2. Get a personal quote</b><br /><span className="text-choc-soft">We review and reply by email.</span></span></li>
              <li className="flex gap-3 sm:flex-col"><Ruler className="shrink-0 text-cocoa" /> <span><b>3. We knit it by hand</b><br /><span className="text-choc-soft">After you approve and pay.</span></span></li>
            </ul>
          </div>
          <div className="relative hidden grid-cols-3 gap-3 lg:grid">
            {pics.map((im, i) => (
              <Img key={i} src={im.url} alt={im.alt} width={500} sizes="200px" className={`aspect-[3/4] rounded-[20px] ${i === 1 ? "translate-y-8" : ""}`} />
            ))}
            <Marshmallow tone="sky" face className="absolute -bottom-6 -left-6 h-16 w-16 animate-float" />
          </div>
        </div>
      </section>

      <section className="wrap grid gap-10 py-14 lg:grid-cols-[1fr_340px] lg:py-20">
        <form onSubmit={submit} className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8" noValidate>
          <h2 className="text-[28px] sm:col-span-2">Request a custom piece</h2>
          <Field label="Your name" error={errors.name}>
            <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-invalid={!!errors.name} maxLength={100} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
          </Field>
          <Field label="Cardigan style" error={errors.style}>
            <select className="field" value={f.style} onChange={(e) => { set("style", e.target.value); if (e.target.value === "Matching couple set") set("couple", true); }} aria-invalid={!!errors.style}>
              <option value="">Choose a style…</option>
              {STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Colour preferences" hint="E.g. cream with blush hearts, sage green">
            <input className="field" value={f.color} onChange={(e) => set("color", e.target.value)} maxLength={80} />
          </Field>
          <Field label="Size">
            <select className="field" value={f.size} onChange={(e) => set("size", e.target.value)}>
              <option value="">Choose a size…</option>
              {SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Fit">
            <select className="field" value={f.fit} onChange={(e) => set("fit", e.target.value)}>
              <option value="">No preference</option>
              {FITS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-3 text-[15px] sm:col-span-2">
            <input type="checkbox" className="size-5 accent-[#3f2a20]" checked={f.couple} onChange={(e) => set("couple", e.target.checked)} />
            This is for a matching couple set (two cardigans)
          </label>
          <Field label="Describe your idea" error={errors.description} className="sm:col-span-2" hint={f.size === "Custom measurements" ? "Include chest, length and sleeve measurements if you have them." : "Patterns, details, buttons, length, who it's for…"}>
            <textarea className="field min-h-36" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={3000} aria-invalid={!!errors.description} />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">Reference images (optional, up to {MAX_FILES})</span>
            <div className="flex flex-wrap gap-3">
              {files.map((x, i) => (
                <div key={x.url} className="relative">
                  <img src={x.url} alt={`Reference ${i + 1}`} className="size-24 rounded-xl border border-beige object-cover" />
                  <button type="button" onClick={() => { URL.revokeObjectURL(x.url); setFiles(files.filter((_, j) => j !== i)); }} className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-choc text-cream" aria-label={`Remove reference ${i + 1}`}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {files.length < MAX_FILES && (
                <button type="button" onClick={() => input.current?.click()} className="grid size-24 place-items-center rounded-xl border-2 border-dashed border-sand text-choc-soft hover:border-choc hover:text-choc">
                  <span className="grid place-items-center gap-1 text-[12px] font-semibold"><ImagePlus size={22} /> Add photo</span>
                </button>
              )}
              <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => pick(e.target.files)} />
            </div>
            {errors.files && <p className="mt-2 text-[13px] font-medium text-rose" role="alert">{errors.files}</p>}
          </div>
          <div className="rounded-2xl bg-sky/50 p-4 text-[14.5px] sm:col-span-2">
            Custom requests are reviewed before a final price is provided. Once we've talked through the details, we'll email you a quote and a payment request — nothing is charged now.
          </div>
          {fail && <p className="text-[14px] font-medium text-rose sm:col-span-2" role="alert">{fail}</p>}
          <button className="btn btn-dark sm:col-span-2 sm:justify-self-start" disabled={!!busy}>
            {busy ? <><Spinner /> {busy}</> : "Send my request"}
          </button>
        </form>
        <aside className="grid h-fit gap-5 text-[15px]">
          <div className="card p-6">
            <h3 className="text-xl">Good to know</h3>
            <ul className="mt-3 grid gap-2.5 text-choc-soft">
              <li>• Custom pieces usually take 3–5 weeks to knit after your quote is approved.</li>
              <li>• Prices depend on size, yarn and pattern complexity.</li>
              <li>• We'll reply within 2–3 days.</li>
              <li>• Questions first? <Link to="/contact" className="underline">Message us</Link>.</li>
            </ul>
          </div>
          <div className="flex items-center gap-3 rounded-[var(--radius-soft)] bg-blush/50 p-5">
            <Marshmallow tone="cream" face className="h-12 w-12 shrink-0" />
            <span>Every custom piece is one of a kind — no two are ever exactly alike.</span>
          </div>
        </aside>
      </section>
    </>
  );
}
