// Order confirmation emails for Marshmallow Knitwear.
// POST { action: "order", number, token } — the order's private lookup token proves the caller placed it.
// Sends nothing (and returns { sent: false }) until RESEND_API_KEY and MAIL_FROM secrets are set.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SITE = (Deno.env.get("SITE_URL") ?? "https://xdf5njwbbm-ux.github.io/marshmallowknitwear").replace(/\/$/, "");
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

type Item = { name: string; size: string; color: string; quantity: number; line_total_cents: number };
type Order = {
  number: string; token: string; name: string; email: string; status: string; payment_status: string; total_cents: number;
  subtotal_cents: number; shipping_cents: number; items: Item[]; venmo_username: string;
  shipping: { name: string; line1: string; line2: string | null; city: string; state: string; zip: string } | null;
  events: { note: string | null }[];
};

function orderEmail(o: Order) {
  const link = `${SITE}/order/${o.number}?t=${o.token}`;
  const handle = o.venmo_username.replace(/^@/, "");
  const placeholder = /^VENMO_USERNAME$/i.test(handle);
  const rows = o.items.map((i) => `<tr><td style="padding:6px 0">${esc(i.name)}<br><span style="color:#8a6f60;font-size:13px">${esc(i.color)} · Size ${esc(i.size)} · Qty ${i.quantity}</span></td><td style="padding:6px 0;text-align:right">${money(i.line_total_cents)}</td></tr>`).join("");
  const s = o.shipping;
  const html = `<!doctype html><html><body style="margin:0;background:#fbf7f1;font-family:Helvetica,Arial,sans-serif;color:#3f2a20">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-family:Georgia,serif;font-size:26px;margin:0 0 4px">Marshmallow Knitwear</p>
<p style="color:#8a6f60;margin:0 0 24px;font-size:13px;letter-spacing:2px;text-transform:uppercase">Handcrafted with love</p>
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px">Thank you, ${esc(o.name.split(" ")[0])}! Your order ${esc(o.number)} is received.</h1>
<div style="background:#fff6d9;border-radius:14px;padding:14px 16px;margin:16px 0"><b>Your order has been received and is awaiting payment confirmation.</b></div>
${placeholder ? `<p>We'll email you our Venmo payment details shortly.</p>` : `<p><b>How to pay:</b> send <b>${money(o.total_cents)}</b> on Venmo to <b>@${esc(handle)}</b> and include <b>${esc(o.number)}</b> in the payment note. We confirm every payment by hand and will email you once it's verified.</p>`}
<p><a href="${link}" style="display:inline-block;background:#3f2a20;color:#fbf7f1;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">View your order &amp; pay</a></p>
<table style="width:100%;border-collapse:collapse;margin-top:20px;border-top:1px solid #eadfce">${rows}
<tr><td style="padding:6px 0;border-top:1px solid #eadfce">Subtotal</td><td style="text-align:right;border-top:1px solid #eadfce">${money(o.subtotal_cents)}</td></tr>
<tr><td style="padding:6px 0">Shipping</td><td style="text-align:right">${o.shipping_cents ? money(o.shipping_cents) : "Free"}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${money(o.total_cents)}</td></tr></table>
${s ? `<p style="margin-top:20px"><b>Shipping to</b><br>${esc(s.name)}<br>${esc(s.line1)}${s.line2 ? `, ${esc(s.line2)}` : ""}<br>${esc(s.city)}, ${esc(s.state)} ${esc(s.zip)}</p>` : ""}
<p style="color:#8a6f60;font-size:13px;margin-top:28px">Every piece is made by hand, so small variations are part of its charm. We never ask for your Venmo password or bank details.</p>
</div></body></html>`;
  const text = `Thank you for your order ${o.number}!\n\nYour order has been received and is awaiting payment confirmation.\n\n${placeholder ? "We'll email you our Venmo payment details shortly." : `Pay ${money(o.total_cents)} on Venmo to @${handle} and include ${o.number} in the payment note.`}\n\nView your order: ${link}\n\nTotal: ${money(o.total_cents)}`;
  return { html, text };
}

async function send(to: string, subject: string, html: string, text: string, replyTo?: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("MAIL_FROM"), to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: { action?: string; number?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (body.action !== "order" || typeof body.number !== "string" || typeof body.token !== "string") return json({ error: "Bad request" }, 400);
  if (!Deno.env.get("RESEND_API_KEY") || !Deno.env.get("MAIL_FROM")) return json({ sent: false, reason: "Email is not set up yet." });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: o, error } = await db.rpc("shop_get_order", { p_number: body.number, p_token: body.token });
  if (error || !o) return json({ error: "Order not found" }, 404);
  const order = o as Order;
  if (order.events.some((e) => e.note === "Confirmation email sent.")) return json({ sent: true, already: true });

  const { data: st } = await db.from("shop_settings").select("contact_email").eq("id", 1).single();
  const shopEmail = Deno.env.get("ADMIN_EMAIL") ?? st?.contact_email;
  try {
    const { html, text } = orderEmail(order);
    await send(order.email, `Order ${order.number} received — awaiting payment`, html, text, shopEmail);
    const { data: row } = await db.from("shop_orders").select("id").eq("number", order.number).single();
    if (row) await db.from("shop_order_events").insert({ order_id: row.id, status: order.status, note: "Confirmation email sent." });
    if (shopEmail) {
      await send(
        shopEmail,
        `New order ${order.number} — ${money(order.total_cents)} (awaiting Venmo payment)`,
        `<p>New order <b>${esc(order.number)}</b> from ${esc(order.name)} (${esc(order.email)}) for <b>${money(order.total_cents)}</b>.</p><p>Check Venmo for a payment with ${esc(order.number)} in the note, then verify it in the admin dashboard: <a href="${SITE}/admin/orders">${SITE}/admin/orders</a></p>`,
        `New order ${order.number} from ${order.name} for ${money(order.total_cents)}. Verify the Venmo payment in ${SITE}/admin/orders`,
      ).catch(() => {});
    }
    return json({ sent: true });
  } catch (e) {
    console.error(e);
    return json({ sent: false, reason: "Email could not be sent." });
  }
});
