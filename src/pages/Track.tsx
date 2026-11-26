import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { friendly } from "../lib/supabase";
import { useMeta } from "../lib/seo";
import { Field, Spinner } from "../components/ui";
import { Marshmallow } from "../components/Brand";
import { rememberOrder } from "./Account";

export function TrackForm({ initialNumber = "" }: { initialNumber?: string }) {
  const navigate = useNavigate();
  const [number, setNumber] = useState(initialNumber.toUpperCase());
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = number.trim().toUpperCase();
    if (!/^MK-[A-Z0-9]{6}$/.test(n)) return setError("Order numbers look like MK-ABC123.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) return setError("Please enter the email you used at checkout.");
    setBusy(true);
    setError(null);
    try {
      const o = await api.lookupOrder(n, email.trim());
      if (!o) setError("We couldn't find an order with that number and email. Please check both and try again.");
      else {
        rememberOrder(o);
        navigate(`/order/${o.number}?t=${o.token}`);
      }
    } catch (x) {
      setError(friendly(x));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Field label="Order number">
        <input className="field font-mono uppercase" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="MK-ABC123" autoCapitalize="characters" />
      </Field>
      <Field label="Email address">
        <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      {error && <p className="text-[14px] font-medium text-rose" role="alert">{error}</p>}
      <button className="btn btn-dark" disabled={busy}>{busy ? <Spinner /> : <><Search size={17} /> Find my order</>}</button>
    </form>
  );
}

export default function Track() {
  useMeta({ title: "Track your order", description: "Look up your Marshmallow Knitwear order with your order number and email.", path: "/track" });
  return (
    <div className="wrap grid gap-12 py-14 lg:grid-cols-2 lg:py-20">
      <div>
        <div className="eyebrow">Order lookup</div>
        <h1 className="mt-3 text-[40px] leading-tight sm:text-[52px]">Track your order</h1>
        <p className="mt-4 max-w-md text-[17px] text-choc-soft">Enter your order number (it starts with MK-) and the email address you used at checkout to see your payment and shipping status.</p>
        <div className="mt-8 flex gap-3">
          <Marshmallow tone="sky" face className="h-12 w-12 animate-float" />
          <Marshmallow tone="sage" className="h-10 w-10 animate-float [animation-delay:1.2s]" />
        </div>
      </div>
      <div className="card p-6 sm:p-8"><TrackForm /></div>
    </div>
  );
}
