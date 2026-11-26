# Marshmallow Knitwear

Online shop for handmade cardigans — product catalogue, bag, checkout, Venmo payment instructions, order tracking, custom-order requests and a private admin dashboard.

**Live site:** https://xdf5njwbbm-ux.github.io/marshmallowknitwear/
**Admin:** https://xdf5njwbbm-ux.github.io/marshmallowknitwear/admin

## How payments work

Customers pay in Venmo; the website never takes card, bank or Venmo login details.

1. The customer places an order and gets an order number (e.g. `MK-7QX2KD`). The order shows **Awaiting Payment**.
2. The payment screen shows the total, the order number, a **Continue to Venmo** button and a QR code. Both pre-fill the amount and a note containing the order number.
3. The customer can tap **I've sent my payment**. This only tells the shop to look; it does not mark anything paid.
4. The owner checks Venmo, opens the order in **Admin → Orders** and presses **Mark payment verified**. Only then does the order become **Payment Confirmed**. The database refuses to move an unpaid order forward.
5. From there the owner moves the order through Preparing → Handmade Production → Shipped (with tracking) → Delivered.

## First-time setup (store owner)

1. Go to `/admin`, sign in (or create an account), then enter the one-time **setup code** you were given privately. That account becomes the store admin and the code stops working.
2. **Settings → Venmo payments:** enter your Venmo username. Until you do, customers are asked to contact you for payment details. Optionally upload the official Venmo logo for the payment screen.
3. **Products:** the starter catalogue uses free stock photos as placeholders. Replace them with photos of your own cardigans (upload, reorder, link photos to colours). Edit prices, sizes, colours and sold-out combinations here too.
4. **Reviews:** the sample reviews are clearly labelled "Sample review". Hide or delete them once real reviews arrive. Customer reviews wait for your approval.
5. **Settings:** shipping price, free-shipping threshold, processing time, announcement bar, contact email, Instagram and homepage text and photos.

## Order emails (optional)

The `shop-mail` Edge Function sends the customer an order confirmation and notifies the shop. It stays off until two secrets are set in Supabase (**Project Settings → Edge Functions → Secrets**):

- `RESEND_API_KEY` — from a free [Resend](https://resend.com) account.
- `MAIL_FROM` — e.g. `Marshmallow Knitwear <orders@yourdomain.com>`. The domain must be verified in Resend.

Optional: `ADMIN_EMAIL` (where new-order alerts go; defaults to the contact email in Settings) and `SITE_URL`.

Without these, the shop works the same. The admin order page has one-tap email templates (order link, payment reminder, payment received, shipped) that open in your own mail app.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # cart/pricing tests
npm run build      # typecheck, build, and pre-render page metadata, sitemap and robots.txt
```

Stack: React 19 + Vite + Tailwind CSS v4, Supabase (Postgres with row-level security, Auth, Storage, Edge Functions), hosted on GitHub Pages. Every push to `main` deploys, and a daily rebuild refreshes product pages and the sitemap.

Database changes live in `supabase/migrations/`; all store tables are prefixed `shop_`. Customers never write to tables directly. Orders, reviews, messages and custom requests go through validated database functions that recompute prices on the server.
