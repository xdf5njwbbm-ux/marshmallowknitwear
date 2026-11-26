import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, ImagePlus, Plus, Star, Trash2, X } from "lucide-react";
import type { Product } from "../lib/types";
import { BADGE, money, slugify } from "../lib/format";
import { friendly } from "../lib/supabase";
import { shrinkImage } from "../lib/img";
import { useCatalog, useToast } from "../state/store";
import { Field, Img, Spinner } from "../components/ui";
import { admin } from "./data";
import { Loading, PageTitle, useLoad } from "./kit";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function Products() {
  const { id } = useParams();
  return id ? <Editor key={id} id={id} /> : <List />;
}

function List() {
  const { data, error, setData } = useLoad(admin.products);
  const catalog = useCatalog();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const toggle = async (p: Product, key: "featured" | "sold_out" | "active") => {
    try {
      await admin.quickProduct(p.id, { [key]: !p[key] });
      setData((data ?? []).map((x) => (x.id === p.id ? { ...x, [key]: !p[key] } : x)));
      catalog.reload();
    } catch (x) {
      toast(friendly(x), "error");
    }
  };
  const rows = (data ?? []).filter((p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <PageTitle title="Products">
        <Link to="/admin/products/new" className="btn btn-dark min-h-11"><Plus size={18} /> New product</Link>
      </PageTitle>
      <input className="field mb-4 max-w-sm" placeholder="Search products" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search products" />
      {!data ? <Loading error={error} /> : (
        <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {rows.map((p) => (
            <li key={p.id} className={`card flex gap-4 p-3 ${p.active ? "" : "opacity-60"}`}>
              <Link to={`/admin/products/${p.id}`} className="shrink-0"><Img src={p.images[0]?.url} alt={p.name} width={240} sizes="96px" className="h-32 w-24 rounded-xl" /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/admin/products/${p.id}`} className="font-display text-[18px] leading-snug hover:underline">{p.name}</Link>
                <div className="text-[14px] text-choc-soft">{money(p.price_cents)} · {p.colors.length} colour{p.colors.length === 1 ? "" : "s"} · {p.images.length} photo{p.images.length === 1 ? "" : "s"}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.badge && <span className="chip bg-oat">{BADGE[p.badge]?.label}</span>}
                  {p.sold_out && <span className="chip bg-rose/20 text-rose">Sold out</span>}
                  {!p.active && <span className="chip bg-oat">Hidden</span>}
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-[12.5px]">
                  <button onClick={() => toggle(p, "featured")} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${p.featured ? "border-choc bg-choc text-cream" : "border-sand"}`}><Star size={13} /> Featured</button>
                  <button onClick={() => toggle(p, "sold_out")} className={`rounded-full border px-2.5 py-1 font-semibold ${p.sold_out ? "border-rose bg-rose text-white" : "border-sand"}`}>Sold out</button>
                  <button onClick={() => toggle(p, "active")} className="inline-flex items-center gap-1 rounded-full border border-sand px-2.5 py-1 font-semibold">{p.active ? <><Eye size={13} /> Visible</> : <><EyeOff size={13} /> Hidden</>}</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type Draft = {
  id?: string; name: string; slug: string; subtitle: string; description: string; price: string; compare: string;
  audience: Product["audience"]; badge: string; categories: string[]; sizes: string[]; colors: { name: string; hex: string }[];
  images: { url: string; alt: string; color: string }[]; materials: string; care: string; details: string; processing_time: string;
  featured: boolean; sold_out: boolean; active: boolean; sort: string; soldOut: Set<string>;
};

const fromProduct = (p?: Product): Draft =>
  p
    ? {
        id: p.id, name: p.name, slug: p.slug, subtitle: p.subtitle, description: p.description, price: (p.price_cents / 100).toFixed(2),
        compare: p.compare_at_cents ? (p.compare_at_cents / 100).toFixed(2) : "", audience: p.audience, badge: p.badge ?? "", categories: p.categories,
        sizes: p.sizes, colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })), images: p.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color ?? "" })),
        materials: p.materials, care: p.care, details: p.details.join("\n"), processing_time: p.processing_time ?? "", featured: p.featured,
        sold_out: p.sold_out, active: p.active, sort: String(p.sort), soldOut: new Set(p.variants.filter((v) => v.sold_out).map((v) => `${v.size}|${v.color}`)),
      }
    : {
        name: "", slug: "", subtitle: "", description: "", price: "", compare: "", audience: "women", badge: "new", categories: [], sizes: [...ALL_SIZES],
        colors: [{ name: "Cream", hex: "#f3ead9" }], images: [], materials: "", care: "Hand wash cold with a gentle wool wash. Dry flat. Store folded.",
        details: "Knitted entirely by hand\nEach piece is unique", processing_time: "", featured: false, sold_out: false, active: true, sort: "0", soldOut: new Set(),
      };

function Editor({ id }: { id: string }) {
  const isNew = id === "new";
  const navigate = useNavigate();
  const toast = useToast();
  const catalog = useCatalog();
  const { data, error } = useLoad(() => (isNew ? Promise.resolve(null) : admin.products().then((l) => l.find((p) => p.id === id) ?? null)), [id]);
  const [d, setD] = useState<Draft | null>(isNew ? fromProduct() : null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (data) setD(fromProduct(data));
  }, [data]);
  const cats = useLoad(admin.categories).data ?? catalog.categories;
  const price = useMemo(() => Math.round(parseFloat(d?.price || "0") * 100), [d?.price]);

  if (!isNew && data === null) return <p>Product not found. <Link className="underline" to="/admin/products">Back to products</Link></p>;
  if (!d) return <Loading error={error} />;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((o) => (o ? { ...o, [k]: v } : o));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading(list.length);
    for (const f of list) {
      try {
        const small = await shrinkImage(f, 2200);
        const url = await admin.uploadProductPhoto(small);
        setD((o) => (o ? { ...o, images: [...o.images, { url, alt: `${o.name}${o.colors[0] ? ` in ${o.colors[0].name}` : ""}`, color: "" }] } : o));
      } catch (x) {
        toast(`${f.name}: ${friendly(x)}`, "error");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (file.current) file.current.value = "";
  };

  const save = async () => {
    setErr(null);
    const missing = !d.name.trim() ? "Give the product a name." : price <= 0 ? "Set a price." : !d.sizes.length ? "Choose at least one size." : !d.colors.filter((c) => c.name.trim()).length ? "Add at least one colour." : !d.images.length ? "Add at least one photo." : null;
    if (missing) return setErr(missing);
    setBusy("save");
    try {
      const colors = d.colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex }));
      const names = new Set(colors.map((c) => c.name));
      const pid = await admin.saveProduct({
        id: d.id ?? "", name: d.name.trim(), slug: d.slug || slugify(d.name), subtitle: d.subtitle.trim(), description: d.description.trim(),
        price_cents: price, compare_at_cents: d.compare ? String(Math.round(parseFloat(d.compare) * 100)) : "", audience: d.audience, badge: d.badge,
        categories: d.categories, sizes: ALL_SIZES.filter((s) => d.sizes.includes(s)), colors,
        images: d.images.map((i) => ({ url: i.url, alt: i.alt.trim() || d.name.trim(), color: names.has(i.color) ? i.color : "" })),
        materials: d.materials.trim(), care: d.care.trim(), details: d.details.split("\n").map((s) => s.trim()).filter(Boolean),
        processing_time: d.processing_time.trim(), featured: d.featured, sold_out: d.sold_out, active: d.active, sort: parseInt(d.sort) || 0,
        sold_out_variants: [...d.soldOut].map((k) => ({ size: k.split("|")[0], color: k.split("|")[1] })),
      });
      await catalog.reload();
      toast(isNew ? "Product created." : "Product saved.");
      if (isNew) navigate(`/admin/products/${pid}`, { replace: true });
    } catch (x) {
      setErr(friendly(x));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!d.id || !confirm(`Delete "${d.name}"? This removes it from the shop. Past orders keep their details.`)) return;
    setBusy("delete");
    try {
      await admin.deleteProduct(d.id);
      await catalog.reload();
      toast("Product deleted.");
      navigate("/admin/products", { replace: true });
    } catch (x) {
      toast(friendly(x), "error");
      setBusy(null);
    }
  };

  const moveImg = (i: number, dir: -1 | 1) => {
    const im = [...d.images];
    const j = i + dir;
    if (j < 0 || j >= im.length) return;
    [im[i], im[j]] = [im[j], im[i]];
    set("images", im);
  };

  return (
    <>
      <Link to="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold hover:underline"><ArrowLeft size={16} /> Products</Link>
      <PageTitle title={isNew ? "New product" : d.name || "Product"}>
        {!isNew && d.active && <a href={`${import.meta.env.BASE_URL}product/${d.slug}`} target="_blank" rel="noreferrer" className="btn-link">View in shop</a>}
      </PageTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid h-fit gap-6">
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <input className="field" value={d.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
            </Field>
            <Field label="Short tagline" className="sm:col-span-2"><input className="field" value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Our signature oversized knit" /></Field>
            <Field label="Description" className="sm:col-span-2"><textarea className="field min-h-36" value={d.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Price ($)"><input className="field" inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} /></Field>
            <Field label="Compare-at price ($, optional)" hint="Shows the price crossed out, for sales."><input className="field" inputMode="decimal" value={d.compare} onChange={(e) => set("compare", e.target.value.replace(/[^\d.]/g, ""))} /></Field>
            <Field label="Web address" hint={`…/product/${d.slug || "…"}`}>
              <input className="field font-mono text-[14px]" value={d.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
            </Field>
            <Field label="Label">
              <select className="field" value={d.badge} onChange={(e) => set("badge", e.target.value)}>
                <option value="">None</option>
                {Object.entries(BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl">Photos</h2>
              <button type="button" onClick={() => file.current?.click()} className="btn btn-light min-h-10 px-4 text-[13.5px]" disabled={uploading > 0}>
                {uploading ? <><Spinner /> Uploading {uploading}…</> : <><ImagePlus size={16} /> Add photos</>}
              </button>
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
            </div>
            <p className="mt-1 text-[13px] text-choc-soft">The first photo is the main one. Portrait photos (3:4) look best. Link a photo to a colour to show it when that colour is chosen.</p>
            {d.images.length === 0 ? (
              <button type="button" onClick={() => file.current?.click()} className="mt-4 grid h-40 w-full place-items-center rounded-2xl border-2 border-dashed border-sand text-choc-soft hover:border-choc">
                <span className="grid place-items-center gap-1 font-semibold"><ImagePlus /> Upload photos</span>
              </button>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {d.images.map((im, i) => (
                  <li key={im.url + i} className="flex gap-3 rounded-2xl border border-beige p-2">
                    <Img src={im.url} alt={im.alt} width={240} sizes="80px" className="h-28 w-20 shrink-0 rounded-xl" />
                    <div className="grid min-w-0 flex-1 content-start gap-2">
                      <input className="field min-h-9 py-1.5 text-[13px]" value={im.alt} onChange={(e) => set("images", d.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Describe the photo" aria-label="Photo description" />
                      <select className="field min-h-9 py-1.5 text-[13px]" value={im.color} onChange={(e) => set("images", d.images.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} aria-label="Colour shown">
                        <option value="">Any colour</option>
                        {d.colors.filter((c) => c.name.trim()).map((c) => <option key={c.name}>{c.name}</option>)}
                      </select>
                      <div className="flex gap-1">
                        {i === 0 && <span className="chip mr-auto bg-sage">Main</span>}
                        <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} className="ml-auto grid size-8 place-items-center rounded-full border border-sand disabled:opacity-30" aria-label="Move earlier"><ArrowUp size={14} /></button>
                        <button type="button" onClick={() => moveImg(i, 1)} disabled={i === d.images.length - 1} className="grid size-8 place-items-center rounded-full border border-sand disabled:opacity-30" aria-label="Move later"><ArrowDown size={14} /></button>
                        <button type="button" onClick={() => set("images", d.images.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-full border border-rose/40 text-rose" aria-label="Remove photo"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-2xl">Sizes & colours</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {ALL_SIZES.map((s) => (
                <button key={s} type="button" onClick={() => set("sizes", d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : [...d.sizes, s])} className={`min-w-14 rounded-full border px-4 py-2 text-[14px] font-semibold ${d.sizes.includes(s) ? "border-choc bg-choc text-cream" : "border-sand"}`} aria-pressed={d.sizes.includes(s)}>
                  {s}
                </button>
              ))}
            </div>
            <ul className="mt-5 grid gap-2">
              {d.colors.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input type="color" value={c.hex} onChange={(e) => set("colors", d.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className="size-11 shrink-0 cursor-pointer rounded-full border border-sand bg-transparent" aria-label={`Swatch for ${c.name || "colour"}`} />
                  <input className="field" value={c.name} onChange={(e) => set("colors", d.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Colour name" aria-label="Colour name" />
                  <button type="button" onClick={() => set("colors", d.colors.filter((_, j) => j !== i))} className="grid size-11 shrink-0 place-items-center rounded-full border border-sand" aria-label="Remove colour" disabled={d.colors.length === 1}><X size={16} /></button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => set("colors", [...d.colors, { name: "", hex: "#e8dccb" }])} className="btn-link mt-3"><Plus size={15} /> Add colour</button>

            {d.sizes.length > 0 && d.colors.some((c) => c.name.trim()) && (
              <div className="mt-6">
                <h3 className="font-sans text-[14px] font-bold">Sold-out combinations</h3>
                <p className="text-[13px] text-choc-soft">Tick any size and colour you can't make right now.</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="text-[13px]">
                    <thead><tr><th /> {ALL_SIZES.filter((s) => d.sizes.includes(s)).map((s) => <th key={s} className="px-2 py-1 font-semibold">{s}</th>)}</tr></thead>
                    <tbody>
                      {d.colors.filter((c) => c.name.trim()).map((c) => (
                        <tr key={c.name}>
                          <td className="py-1 pr-3 whitespace-nowrap">{c.name}</td>
                          {ALL_SIZES.filter((s) => d.sizes.includes(s)).map((s) => {
                            const k = `${s}|${c.name.trim()}`;
                            return (
                              <td key={s} className="px-2 text-center">
                                <input type="checkbox" className="size-4 accent-[#c2665d]" checked={d.soldOut.has(k)} aria-label={`${c.name} ${s} sold out`} onChange={() => { const n = new Set(d.soldOut); if (n.has(k)) n.delete(k); else n.add(k); set("soldOut", n); }} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="card grid gap-4 p-5">
            <h2 className="text-2xl">Details</h2>
            <Field label="Materials"><textarea className="field min-h-20" value={d.materials} onChange={(e) => set("materials", e.target.value)} placeholder="e.g. 100% soft acrylic blend, wooden buttons" /></Field>
            <Field label="Care"><textarea className="field min-h-20" value={d.care} onChange={(e) => set("care", e.target.value)} /></Field>
            <Field label="Handmade details (one per line)"><textarea className="field min-h-28" value={d.details} onChange={(e) => set("details", e.target.value)} /></Field>
            <Field label="Processing time (optional)" hint={`Leave empty to use the store default (${catalog.settings.processing_time}).`}><input className="field" value={d.processing_time} onChange={(e) => set("processing_time", e.target.value)} /></Field>
          </section>
        </div>

        <aside className="grid h-fit gap-6 xl:sticky xl:top-6">
          <section className="card grid gap-3 p-5">
            <label className="flex items-center justify-between gap-3 text-[15px] font-semibold">Visible in shop <input type="checkbox" className="size-5 accent-[#3f2a20]" checked={d.active} onChange={(e) => set("active", e.target.checked)} /></label>
            <label className="flex items-center justify-between gap-3 text-[15px] font-semibold">Featured on homepage <input type="checkbox" className="size-5 accent-[#3f2a20]" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} /></label>
            <label className="flex items-center justify-between gap-3 text-[15px] font-semibold">Sold out (all sizes) <input type="checkbox" className="size-5 accent-[#c2665d]" checked={d.sold_out} onChange={(e) => set("sold_out", e.target.checked)} /></label>
            <Field label="Shown for">
              <select className="field" value={d.audience} onChange={(e) => set("audience", e.target.value as Product["audience"])}>
                <option value="women">Women</option><option value="men">Men</option><option value="unisex">Everyone (unisex)</option>
              </select>
            </Field>
            <Field label="Sort order" hint="Lower numbers show first."><input className="field" inputMode="numeric" value={d.sort} onChange={(e) => set("sort", e.target.value.replace(/[^\d-]/g, ""))} /></Field>
          </section>
          <section className="card p-5">
            <h2 className="font-sans text-[15px] font-bold">Categories</h2>
            <div className="mt-3 grid gap-2">
              {cats.map((c) => (
                <label key={c.slug} className="flex items-center gap-3 text-[14.5px]">
                  <input type="checkbox" className="size-5 accent-[#3f2a20]" checked={d.categories.includes(c.slug)} onChange={() => set("categories", d.categories.includes(c.slug) ? d.categories.filter((x) => x !== c.slug) : [...d.categories, c.slug])} />
                  {c.name}
                </label>
              ))}
            </div>
          </section>
          {err && <p className="rounded-2xl bg-blush/60 p-4 text-[14px] font-medium" role="alert">{err}</p>}
          <button className="btn btn-dark" onClick={save} disabled={!!busy || uploading > 0}>{busy === "save" ? <Spinner /> : isNew ? "Create product" : "Save changes"}</button>
          {!isNew && <button className="inline-flex items-center justify-center gap-2 text-[14px] font-semibold text-rose underline" onClick={remove} disabled={!!busy}><Trash2 size={15} /> Delete product</button>}
        </aside>
      </div>
    </>
  );
}
