import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Plus, Trash2 } from "lucide-react";
import type { Category, Settings } from "../lib/types";
import { moneyExact, slugify } from "../lib/format";
import { friendly } from "../lib/supabase";
import { shrinkImage } from "../lib/img";
import { cleanHandle, isPlaceholder, venmoUrl } from "../lib/venmo";
import { useCatalog, useToast } from "../state/store";
import { Field, Img, Spinner } from "../components/ui";
import { admin } from "./data";
import { Loading, PageTitle, useLoad } from "./kit";

type Form = {
  venmo_username: string; venmo_link: string; venmo_logo_url: string; shipping: string; free_over: string; processing_time: string;
  announcement: string; contact_email: string; instagram: string; phone: string; hero_heading: string; hero_text: string; hero_image_women: string; hero_image_men: string;
};
const toForm = (s: Settings): Form => ({
  venmo_username: isPlaceholder(s.venmo_username) ? "" : cleanHandle(s.venmo_username), venmo_link: s.venmo_link ?? "", venmo_logo_url: s.venmo_logo_url ?? "",
  shipping: (s.shipping_flat_cents / 100).toFixed(2), free_over: s.free_shipping_over_cents != null ? (s.free_shipping_over_cents / 100).toFixed(2) : "",
  processing_time: s.processing_time, announcement: s.announcement, contact_email: s.contact_email, instagram: s.instagram, phone: s.phone ?? "",
  hero_heading: s.hero_heading, hero_text: s.hero_text, hero_image_women: s.hero_image_women ?? "", hero_image_men: s.hero_image_men ?? "",
});

export default function SettingsPage() {
  const { data, error } = useLoad(admin.settings);
  const [f, setF] = useState<Form | null>(null);
  const [errs, setErrs] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const catalog = useCatalog();
  const toast = useToast();
  useEffect(() => {
    if (data) setF(toForm(data));
  }, [data]);
  if (!f || !data) return <Loading error={error} />;
  const set = (k: keyof Form, v: string) => {
    setF({ ...f, [k]: v });
    setErrs({ ...errs, [k]: undefined });
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(toForm(data));

  const save = async () => {
    const e: typeof errs = {};
    const handle = cleanHandle(f.venmo_username);
    if (handle && !/^[A-Za-z0-9_-]{5,30}$/.test(handle)) e.venmo_username = "Venmo usernames are 5–30 letters, numbers, dashes or underscores.";
    if (f.venmo_link && !/^https:\/\/(www\.)?(venmo\.com|account\.venmo\.com)\//i.test(f.venmo_link.trim())) e.venmo_link = "Use a link that starts with https://venmo.com/ (or leave this empty).";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.contact_email.trim())) e.contact_email = "Enter a valid email.";
    if (!(parseFloat(f.shipping) >= 0)) e.shipping = "Enter a shipping price (0 for free).";
    if (f.free_over && !(parseFloat(f.free_over) > 0)) e.free_over = "Enter an amount, or leave empty for no free shipping.";
    if (f.hero_heading.trim().length < 3) e.hero_heading = "Add a heading.";
    setErrs(e);
    if (Object.values(e).some(Boolean)) return toast("Please fix the highlighted fields.", "error");
    setBusy(true);
    try {
      await admin.saveSettings({
        venmo_username: handle || "VENMO_USERNAME", venmo_link: f.venmo_link.trim() || null, venmo_logo_url: f.venmo_logo_url.trim() || null,
        shipping_flat_cents: Math.round(parseFloat(f.shipping) * 100), free_shipping_over_cents: f.free_over ? Math.round(parseFloat(f.free_over) * 100) : null,
        processing_time: f.processing_time.trim() || "2–3 weeks", announcement: f.announcement.trim(), contact_email: f.contact_email.trim(),
        instagram: f.instagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, ""), phone: f.phone.trim() || null,
        hero_heading: f.hero_heading.trim(), hero_text: f.hero_text.trim(), hero_image_women: f.hero_image_women.trim() || null, hero_image_men: f.hero_image_men.trim() || null,
      });
      await catalog.reload();
      toast("Settings saved — the shop is updated.");
    } catch (x) {
      toast(friendly(x), "error");
    } finally {
      setBusy(false);
    }
  };

  const handle = cleanHandle(f.venmo_username);
  const test = handle ? venmoUrl(handle, 100, "Test from Marshmallow Knitwear admin", f.venmo_link || null) : "";

  return (
    <>
      <PageTitle title="Settings">
        <button className="btn btn-dark min-h-11" onClick={save} disabled={busy || !dirty}>{busy ? <Spinner /> : dirty ? "Save changes" : "Saved"}</button>
      </PageTitle>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card grid h-fit gap-4 p-5">
          <h2 className="text-2xl">Venmo payments</h2>
          <p className="-mt-2 text-[14px] text-choc-soft">Customers pay you directly in Venmo. Your username is shown on the payment screen and used for the "Continue to Venmo" button and QR code. Orders are only marked paid when you verify them in Orders.</p>
          <Field label="Venmo username" error={errs.venmo_username} hint={isPlaceholder(data.venmo_username) ? "Not set yet — customers will be asked to contact you for payment details." : undefined}>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 text-choc-soft">@</span>
              <input className="field pl-8" value={f.venmo_username} onChange={(e) => set("venmo_username", e.target.value.replace(/^@/, ""))} placeholder="your-venmo-username" autoCapitalize="none" autoCorrect="off" />
            </div>
          </Field>
          <Field label="Custom Venmo link (optional)" error={errs.venmo_link} hint="Only if you want the button to use a specific Venmo profile link. Must start with https://venmo.com/">
            <input className="field" value={f.venmo_link} onChange={(e) => set("venmo_link", e.target.value)} placeholder="https://venmo.com/u/your-name" />
          </Field>
          {test && <a href={test} target="_blank" rel="noreferrer" className="btn-link w-fit">Test the payment link ($1.00) <ExternalLink size={14} /></a>}
          <ImageSetting label="Venmo logo (optional)" hint="Upload the official Venmo logo from Venmo's brand resources to show it on the payment screen. Without it, a simple 'Venmo' label is shown." value={f.venmo_logo_url} onChange={(v) => set("venmo_logo_url", v)} contain />
        </section>

        <section className="card grid h-fit gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-2xl sm:col-span-2">Shipping & processing</h2>
          <Field label="Flat shipping price ($)" error={errs.shipping}><input className="field" inputMode="decimal" value={f.shipping} onChange={(e) => set("shipping", e.target.value.replace(/[^\d.]/g, ""))} /></Field>
          <Field label="Free shipping over ($)" error={errs.free_over} hint="Leave empty for no free shipping."><input className="field" inputMode="decimal" value={f.free_over} onChange={(e) => set("free_over", e.target.value.replace(/[^\d.]/g, ""))} /></Field>
          <Field label="Default processing time" className="sm:col-span-2" hint="Shown on product pages and in the FAQ."><input className="field" value={f.processing_time} onChange={(e) => set("processing_time", e.target.value)} /></Field>
          <p className="text-[13px] text-choc-soft sm:col-span-2">Currently: {moneyExact(Math.round(parseFloat(f.shipping || "0") * 100))} per order{f.free_over ? `, free over ${moneyExact(Math.round(parseFloat(f.free_over) * 100))}` : ""}.</p>
        </section>

        <section className="card grid h-fit gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-2xl sm:col-span-2">Contact & announcement</h2>
          <Field label="Announcement bar" className="sm:col-span-2" hint="Separate phrases with •"><input className="field" value={f.announcement} onChange={(e) => set("announcement", e.target.value)} /></Field>
          <Field label="Contact email" error={errs.contact_email}><input className="field" type="email" value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></Field>
          <Field label="Instagram username"><input className="field" value={f.instagram} onChange={(e) => set("instagram", e.target.value)} /></Field>
          <Field label="Phone (optional)"><input className="field" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        </section>

        <section className="card grid h-fit gap-4 p-5">
          <h2 className="text-2xl">Homepage</h2>
          <Field label="Hero heading" error={errs.hero_heading} hint="Put a full stop between the two lines, e.g. 'Handmade With Love. Worn With Comfort.'"><input className="field" value={f.hero_heading} onChange={(e) => set("hero_heading", e.target.value)} /></Field>
          <Field label="Hero text"><textarea className="field min-h-24" value={f.hero_text} onChange={(e) => set("hero_text", e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageSetting label="Women's hero photo" value={f.hero_image_women} onChange={(v) => set("hero_image_women", v)} />
            <ImageSetting label="Men's hero photo" value={f.hero_image_men} onChange={(v) => set("hero_image_men", v)} />
          </div>
        </section>

        <Categories />
      </div>
      {dirty && (
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <button className="btn btn-dark shadow-lift" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Save changes"}</button>
        </div>
      )}
    </>
  );
}

function ImageSetting({ label, hint, value, onChange, contain = false }: { label: string; hint?: string; value: string; onChange: (v: string) => void; contain?: boolean }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          contain ? <img src={value} alt="" className="h-12 max-w-40 rounded-lg border border-beige bg-white object-contain p-1" /> : <Img src={value} alt="" width={200} sizes="80px" className="h-24 w-20 rounded-xl" />
        ) : (
          <span className="grid h-12 w-20 place-items-center rounded-lg border border-dashed border-sand text-[12px] text-choc-soft">{contain ? "None" : "Default"}</span>
        )}
        <div className="flex flex-col items-start gap-1 text-[13.5px]">
          <button type="button" className="inline-flex items-center gap-1.5 font-semibold underline" onClick={() => input.current?.click()} disabled={busy}>{busy ? <Spinner /> : <><ImagePlus size={15} /> Upload</>}</button>
          {value && <button type="button" className="text-rose underline" onClick={() => onChange("")}>Remove</button>}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              onChange(await admin.uploadSettingsImage(contain ? file : await shrinkImage(file, 2000)));
            } catch (x) {
              toast(friendly(x), "error");
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>
      {hint && <p className="mt-1.5 text-[12.5px] text-choc-soft">{hint}</p>}
    </div>
  );
}

function Categories() {
  const toast = useToast();
  const catalog = useCatalog();
  const { data, error, setData } = useLoad(admin.categories);
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  const upd = (i: number, patch: Partial<Category>) => setData(data.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const save = async (c: Category, i: number) => {
    if (!c.name.trim()) return toast("Give the category a name.", "error");
    const slug = c.slug || slugify(c.name);
    if (!c.slug && data.some((x) => x.slug === slug)) return toast("A category with that name already exists.", "error");
    setBusy(c.slug);
    try {
      await admin.saveCategory({ ...c, name: c.name.trim(), slug });
      upd(i, { slug });
      await catalog.reload();
      toast("Category saved.");
    } catch (x) {
      toast(friendly(x), "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="card grid h-fit gap-4 p-5 xl:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Categories</h2>
        <button className="btn-link" onClick={() => setData([...data, { slug: "", name: "", description: "", image: null, sort: data.length + 1 }])}><Plus size={15} /> Add category</button>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {data.map((c, i) => (
          <li key={i} className="grid gap-3 rounded-2xl border border-beige p-3 sm:grid-cols-[96px_1fr]">
            <ImageSetting label="Photo" value={c.image ?? ""} onChange={(v) => upd(i, { image: v || null })} />
            <div className="grid gap-2">
              <input className="field" value={c.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Category name" aria-label="Category name" />
              <input className="field" value={c.description} onChange={(e) => upd(i, { description: e.target.value })} placeholder="Short description" aria-label="Category description" />
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-choc-soft">/shop/{c.slug || slugify(c.name) || "…"}</span>
                <input className="field ml-auto min-h-9 w-16 py-1 text-center" inputMode="numeric" value={c.sort} onChange={(e) => upd(i, { sort: parseInt(e.target.value) || 0 })} aria-label="Sort order" title="Sort order" />
                <button className="btn btn-dark min-h-9 px-4 text-[13px]" onClick={() => save(c, i)} disabled={busy !== null}>{busy === c.slug ? <Spinner /> : "Save"}</button>
                {c.slug && (
                  <button
                    className="grid size-9 place-items-center rounded-full text-rose"
                    aria-label={`Delete ${c.name}`}
                    onClick={async () => {
                      if (!confirm(`Delete the "${c.name}" category? Products stay in the shop.`)) return;
                      try {
                        await admin.deleteCategory(c.slug);
                        setData(data.filter((_, j) => j !== i));
                        catalog.reload();
                      } catch (x) {
                        toast(friendly(x), "error");
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
