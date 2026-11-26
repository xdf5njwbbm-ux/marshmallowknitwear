import { lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { ExternalLink, Gauge, Inbox, KeyRound, LogOut, Menu, MessageSquareText, Package, Settings as Cog, Shirt, Star, X } from "lucide-react";
import { supabase, friendly } from "../lib/supabase";
import { SITE_URL, useMeta } from "../lib/seo";
import { Logo } from "../components/Brand";
import { Field, Spinner } from "../components/ui";
import { admin } from "./data";

const Overview = lazy(() => import("./Overview"));
const Orders = lazy(() => import("./Orders"));
const Products = lazy(() => import("./Products"));
const Requests = lazy(() => import("./Inbox").then((m) => ({ default: m.Requests })));
const Messages = lazy(() => import("./Inbox").then((m) => ({ default: m.Messages })));
const Reviews = lazy(() => import("./Inbox").then((m) => ({ default: m.Reviews })));
const SettingsPage = lazy(() => import("./SettingsPage"));

const NAV = [
  { to: "/admin", label: "Overview", icon: Gauge, end: true },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/products", label: "Products", icon: Shirt },
  { to: "/admin/requests", label: "Custom requests", icon: Inbox },
  { to: "/admin/messages", label: "Messages", icon: MessageSquareText },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/settings", label: "Settings", icon: Cog },
];

export default function Admin() {
  useMeta({ title: "Store admin", noindex: true });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((ev, s) => {
      if (ev === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setIsAdmin(undefined);
    admin.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined || (session && isAdmin === undefined)) return <Center><Spinner className="size-8 text-cocoa" /></Center>;
  if (recovery && session) return <Center><NewPassword onDone={() => setRecovery(false)} /></Center>;
  if (!session) return <Center><SignIn /></Center>;
  if (!isAdmin) return <Center><Claim email={session.user.email ?? ""} onClaimed={() => setIsAdmin(true)} /></Center>;
  return <Shell email={session.user.email ?? ""} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-oat/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {children}
      </div>
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const redirect = `${SITE_URL}/admin`;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === "up") {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, text: "Check your email to confirm your account, then come back here and sign in." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect });
        if (error) throw error;
        setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
      }
    } catch (x) {
      setMsg({ text: friendly(x) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card grid gap-4 p-6 sm:p-8">
      <div>
        <h1 className="text-[28px]">{mode === "in" ? "Store admin" : mode === "up" ? "Create an admin account" : "Reset your password"}</h1>
        <p className="mt-1 text-[14px] text-choc-soft">This area is only for the store owner. Customers don't need an account.</p>
      </div>
      <Field label="Email"><input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
      {mode !== "reset" && (
        <Field label="Password"><input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} required minLength={mode === "up" ? 8 : 1} /></Field>
      )}
      {msg && <p className={`text-[14px] font-medium ${msg.ok ? "text-sage-deep" : "text-rose"}`} role="alert">{msg.text}</p>}
      <button className="btn btn-dark" disabled={busy}>{busy ? <Spinner /> : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}</button>
      <div className="flex flex-wrap justify-between gap-2 text-[13.5px]">
        {mode !== "in" ? <button type="button" className="underline" onClick={() => setMode("in")}>Back to sign in</button> : <button type="button" className="underline" onClick={() => setMode("up")}>Create an account</button>}
        {mode === "in" && <button type="button" className="underline" onClick={() => setMode("reset")}>Forgot password?</button>}
      </div>
      <Link to="/" className="text-center text-[13px] text-choc-soft underline">← Back to the shop</Link>
    </form>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="card grid gap-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) return setErr("Use at least 8 characters.");
        setBusy(true);
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false);
        if (error) setErr(friendly(error));
        else onDone();
      }}
    >
      <h1 className="text-[26px]">Choose a new password</h1>
      <Field label="New password" error={err}><input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
      <button className="btn btn-dark" disabled={busy}>{busy ? <Spinner /> : "Save password"}</button>
    </form>
  );
}

function Claim({ email, onClaimed }: { email: string; onClaimed: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="card grid gap-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          if (await admin.claim(code.trim().toUpperCase())) onClaimed();
        } catch (x) {
          setErr(friendly(x));
        } finally {
          setBusy(false);
        }
      }}
    >
      <KeyRound className="text-cocoa" />
      <h1 className="text-[26px]">Not an admin yet</h1>
      <p className="text-[14.5px] text-choc-soft">You're signed in as <b className="text-choc">{email}</b>, but this account doesn't have store access. If you're the owner, enter your one-time setup code to make this account the store admin.</p>
      <Field label="Setup code" error={err}><input className="field font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoComplete="off" /></Field>
      <button className="btn btn-dark" disabled={busy || code.trim().length < 6}>{busy ? <Spinner /> : "Unlock admin"}</button>
      <button type="button" className="text-[13.5px] underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </form>
  );
}

function Shell({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const nav = (
    <nav className="grid gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium ${isActive ? "bg-choc text-cream" : "hover:bg-oat"}`}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );
  const foot = (
    <div className="grid gap-2 border-t border-beige pt-4 text-[13px]">
      <a href={SITE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><ExternalLink size={15} /> View the shop</a>
      <span className="truncate text-choc-soft">{email}</span>
      <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-left hover:underline"><LogOut size={15} /> Sign out</button>
    </div>
  );
  return (
    <div className="min-h-dvh bg-oat/40 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-beige bg-paper p-5 lg:flex">
        <Link to="/admin"><Logo compact /></Link>
        <div className="flex-1">{nav}</div>
        {foot}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-beige bg-paper/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="-ml-2 grid size-10 place-items-center" aria-label="Open admin menu"><Menu size={21} /></button>
        <Link to="/admin"><Logo compact /></Link>
        <span className="w-8" />
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-choc/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-paper p-5">
            <button onClick={() => setOpen(false)} className="self-end" aria-label="Close menu"><X /></button>
            <div className="flex-1">{nav}</div>
            {foot}
          </div>
        </div>
      )}
      <main className="min-w-0 p-4 sm:p-6 lg:p-10">
        <Suspense fallback={<div className="grid h-60 place-items-center"><Spinner className="size-7 text-cocoa" /></div>}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<Products />} />
            <Route path="requests" element={<Requests />} />
            <Route path="messages" element={<Messages />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<p>Page not found. <Link to="/admin" className="underline">Back to overview</Link></p>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
