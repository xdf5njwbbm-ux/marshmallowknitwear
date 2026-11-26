import { useEffect, useState } from "react";
import { Check, ChevronDown, Mail, Trash2 } from "lucide-react";
import type { Review } from "../lib/types";
import { date, money } from "../lib/format";
import { friendly } from "../lib/supabase";
import { useCatalog, useToast } from "../state/store";
import { Field, Spinner, Stars } from "../components/ui";
import { admin, type CustomRequest, type Message } from "./data";
import { Loading, PageTitle, useLoad } from "./kit";

const REQ_STATUS: Record<CustomRequest["status"], { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-blush" },
  reviewing: { label: "Reviewing", tone: "bg-sky" },
  quoted: { label: "Quote sent", tone: "bg-butter" },
  accepted: { label: "Accepted", tone: "bg-sage" },
  declined: { label: "Declined", tone: "bg-oat" },
  done: { label: "Done", tone: "bg-oat" },
};

export function Requests() {
  const { data, error, setData } = useLoad(admin.requests);
  const [show, setShow] = useState<"open" | "all">("open");
  if (!data) return <Loading error={error} />;
  const rows = data.filter((r) => show === "all" || !["declined", "done"].includes(r.status));
  return (
    <>
      <PageTitle title="Custom requests">
        <Toggle value={show} onChange={setShow} options={[["open", "Open"], ["all", "All"]]} />
      </PageTitle>
      {rows.length === 0 ? <Empty text="No custom requests yet." /> : (
        <ul className="grid gap-4">
          {rows.map((r) => <RequestCard key={r.id} r={r} onChange={(n) => setData(data.map((x) => (x.id === n.id ? n : x)))} />)}
        </ul>
      )}
    </>
  );
}

function RequestCard({ r, onChange }: { r: CustomRequest; onChange: (r: CustomRequest) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(r.status === "new");
  const [imgs, setImgs] = useState<string[] | null>(null);
  const [status, setStatus] = useState(r.status);
  const [quote, setQuote] = useState(r.quote_cents ? (r.quote_cents / 100).toFixed(2) : "");
  const [notes, setNotes] = useState(r.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const expand = () => setOpen(!open);
  useEffect(() => {
    if (open && !imgs && r.image_paths.length) admin.requestImageUrls(r.image_paths).then(setImgs).catch(() => setImgs([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setBusy(true);
    try {
      const patch = { status, quote_cents: quote ? Math.round(parseFloat(quote) * 100) : null, admin_notes: notes.trim() || null };
      await admin.updateRequest(r.id, patch);
      onChange({ ...r, ...patch });
      toast("Request updated.");
    } catch (x) {
      toast(friendly(x), "error");
    } finally {
      setBusy(false);
    }
  };
  const first = r.name.split(" ")[0];
  const quoteMail = `mailto:${r.email}?subject=${encodeURIComponent("Your custom Marshmallow Knitwear piece")}&body=${encodeURIComponent(
    `Hi ${first},\n\nThank you so much for your custom request (${r.style}${r.color ? `, ${r.color}` : ""}${r.size ? `, size ${r.size}` : ""}).\n\n${quote ? `The final price would be ${money(Math.round(parseFloat(quote) * 100))}, plus shipping. ` : ""}If you'd like to go ahead, reply to this email and I'll send you a Venmo payment request. Work starts once payment is received.\n\nWith love,\nMarshmallow Knitwear`,
  )}`;
  return (
    <li className="card overflow-hidden">
      <button onClick={expand} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left hover:bg-oat/40">
        <span className={`chip ${REQ_STATUS[r.status].tone}`}>{REQ_STATUS[r.status].label}</span>
        <span className="font-semibold">{r.name}</span>
        <span className="text-[14px] text-choc-soft">{r.style}{r.couple ? " · couple set" : ""}</span>
        <span className="ml-auto text-[13px] text-choc-soft">{date(r.created_at)}</span>
        <ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-5 border-t border-beige p-4 lg:grid-cols-[1fr_320px]">
          <div className="text-[14.5px]">
            <dl className="grid grid-cols-[90px_1fr] gap-y-1">
              <dt className="text-choc-soft">Email</dt><dd><a className="underline" href={`mailto:${r.email}`}>{r.email}</a></dd>
              <dt className="text-choc-soft">Colour</dt><dd>{r.color || "—"}</dd>
              <dt className="text-choc-soft">Size</dt><dd>{r.size || "—"}</dd>
              <dt className="text-choc-soft">Fit</dt><dd>{r.fit || "—"}</dd>
            </dl>
            <p className="mt-3 rounded-xl bg-oat/60 p-3 whitespace-pre-line">{r.description}</p>
            {r.image_paths.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {imgs === null ? <Spinner /> : imgs.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt={`Reference ${i + 1}`} className="size-28 rounded-xl border border-beige object-cover" /></a>)}
              </div>
            )}
          </div>
          <div className="grid h-fit gap-3">
            <Field label="Status">
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value as CustomRequest["status"])}>
                {Object.entries(REQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Quote ($)"><input className="field" inputMode="decimal" value={quote} onChange={(e) => setQuote(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
            <Field label="Private notes"><textarea className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-dark min-h-10 px-5 text-[14px]" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Save"}</button>
              <a className="btn btn-light min-h-10 px-5 text-[14px]" href={quoteMail}><Mail size={15} /> Email {quote ? "quote" : "reply"}</a>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function Messages() {
  const toast = useToast();
  const { data, error, setData } = useLoad(admin.messages);
  const [show, setShow] = useState<"open" | "all">("open");
  if (!data) return <Loading error={error} />;
  const rows = data.filter((m) => show === "all" || !m.handled);
  const update = async (m: Message, handled: boolean) => {
    try {
      await admin.updateMessage(m.id, handled);
      setData(data.map((x) => (x.id === m.id ? { ...x, handled } : x)));
    } catch (x) {
      toast(friendly(x), "error");
    }
  };
  return (
    <>
      <PageTitle title="Messages">
        <Toggle value={show} onChange={setShow} options={[["open", "To answer"], ["all", "All"]]} />
      </PageTitle>
      {rows.length === 0 ? <Empty text={show === "open" ? "You're all caught up." : "No messages yet."} /> : (
        <ul className="grid gap-3">
          {rows.map((m) => (
            <li key={m.id} className={`card p-4 ${m.handled ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{m.name}</span>
                <a href={`mailto:${m.email}`} className="text-[14px] underline">{m.email}</a>
                <span className="chip bg-oat normal-case">{m.subject || "Message"}</span>
                <span className="ml-auto text-[13px] text-choc-soft">{date(m.created_at, true)}</span>
              </div>
              <p className="mt-2 text-[14.5px] whitespace-pre-line">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[13.5px]">
                <a className="inline-flex items-center gap-1.5 rounded-full border border-sand px-3 py-1.5 font-semibold hover:border-choc" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Your message"}`)}&body=${encodeURIComponent(`Hi ${m.name.split(" ")[0]},\n\n\n\n> ${m.message.replace(/\n/g, "\n> ")}`)}`} onClick={() => !m.handled && update(m, true)}><Mail size={14} /> Reply</a>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-sand px-3 py-1.5 font-semibold hover:border-choc" onClick={() => update(m, !m.handled)}><Check size={14} /> {m.handled ? "Mark as unanswered" : "Mark as answered"}</button>
                <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-rose" onClick={async () => { if (!confirm("Delete this message?")) return; try { await admin.deleteMessage(m.id); setData(data.filter((x) => x.id !== m.id)); } catch (x) { toast(friendly(x), "error"); } }}><Trash2 size={14} /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function Reviews() {
  const toast = useToast();
  const catalog = useCatalog();
  const { data, error, setData } = useLoad(admin.reviews);
  if (!data) return <Loading error={error} />;
  const name = (id: string | null) => catalog.products.find((p) => p.id === id)?.name ?? "General";
  const patch = async (r: Review, p: Partial<Review>) => {
    try {
      await admin.updateReview(r.id, p);
      setData(data.map((x) => (x.id === r.id ? { ...x, ...p } : x)));
    } catch (x) {
      toast(friendly(x), "error");
    }
  };
  const pending = data.filter((r) => !r.approved);
  const live = data.filter((r) => r.approved);
  const card = (r: Review) => (
    <li key={r.id} className="card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} />
        <span className="font-semibold">{r.name}</span>
        {r.is_sample && <span className="chip bg-butter">Sample</span>}
        <span className="text-[13px] text-choc-soft">on {name(r.product_id)}</span>
        <span className="ml-auto text-[13px] text-choc-soft">{date(r.created_at)}</span>
      </div>
      {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
      <p className="mt-1 text-[14.5px] whitespace-pre-line">{r.body}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[13.5px]">
        <button className={`rounded-full px-3 py-1.5 font-semibold ${r.approved ? "border border-sand hover:border-choc" : "bg-choc text-cream"}`} onClick={() => patch(r, { approved: !r.approved })}>{r.approved ? "Hide from shop" : "Approve & publish"}</button>
        <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-rose" onClick={async () => { if (!confirm("Delete this review?")) return; try { await admin.deleteReview(r.id); setData(data.filter((x) => x.id !== r.id)); } catch (x) { toast(friendly(x), "error"); } }}><Trash2 size={14} /> Delete</button>
      </div>
    </li>
  );
  return (
    <>
      <PageTitle title="Reviews" />
      <p className="-mt-3 mb-6 max-w-2xl text-[14.5px] text-choc-soft">Customer reviews wait here until you approve them. Sample reviews are labelled "Sample review" on the site so no one mistakes them for real feedback — hide or delete them once real reviews arrive.</p>
      <h2 className="mb-3 font-sans text-[15px] font-bold">Waiting for approval ({pending.length})</h2>
      {pending.length ? <ul className="mb-8 grid gap-3">{pending.map(card)}</ul> : <Empty text="No reviews waiting." />}
      <h2 className="mt-8 mb-3 font-sans text-[15px] font-bold">Published ({live.length})</h2>
      <ul className="grid gap-3">{live.map(card)}</ul>
    </>
  );
}

function Toggle<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-full border border-sand bg-paper p-1 text-[13.5px] font-semibold">
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={`rounded-full px-4 py-1.5 ${value === k ? "bg-choc text-cream" : ""}`}>{l}</button>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="card p-8 text-center text-[14.5px] text-choc-soft">{text}</p>;
}
