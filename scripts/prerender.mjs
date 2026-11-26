// After `vite build`: writes one HTML file per public page with its own title, description,
// social-card tags and structured data (so links shared on Instagram/iMessage and search engines
// see the right content), plus 404.html (the app shell for every other route), sitemap.xml and robots.txt.
// Product pages are read from Supabase; if it can't be reached the static pages are still written.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DIST = "dist";
const BASE = (process.env.BASE ?? "/marshmallowknitwear/").replace(/\/?$/, "/");
const SITE = (process.env.VITE_SITE_URL ?? `https://xdf5njwbbm-ux.github.io${BASE}`).replace(/\/$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://dmynmniiapfrpzfxgqwn.supabase.co";
const KEY = process.env.VITE_SUPABASE_KEY ?? "sb_publishable_3wszEFLCya9n0bCSpArFvg_A0DI2e7n";
const NAME = "Marshmallow Knitwear";
const DEFAULT_DESC = "Handmade knitted cardigans for women and men — cozy, artistic and made with love, one stitch at a time.";
const OG = `${SITE}/brand/og-base.jpg`;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ogImage = (url) => {
  if (!url) return OG;
  if (url.includes("images.unsplash.com")) return url.replace(/([?&])w=\d+/, "$1w=1200");
  return url;
};

async function rest(path) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function page(shell, { path, title, description = DEFAULT_DESC, image = OG, type = "website", jsonLd = null, noindex = false }) {
  const full = title ? `${title} | ${NAME}` : `${NAME} — Handmade Cardigans, Knitted With Love`;
  const url = `${SITE}${path === "/" ? "/" : path}`;
  const head = [
    `<title>${esc(full)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:title" content="${esc(full)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="robots" content="${noindex ? "noindex" : "index,follow"}" />`,
    jsonLd ? `<script type="application/ld+json" data-mk-ld="1">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : "",
  ].join("\n    ");
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/\s*<meta (name|property)="(description|og:[a-z_]+|twitter:card)"[^>]*>/g, "")
    .replace("</head>", `    ${head}\n  </head>`);
}

async function write(route, html) {
  const file = route === "/" ? join(DIST, "index.html") : join(DIST, `${route.replace(/^\//, "")}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

const shell = await readFile(join(DIST, "index.html"), "utf8");
let settings = { instagram: "marshmallowknitwear" };
let categories = [
  { slug: "women", name: "Women's Cardigans", description: "" },
  { slug: "men", name: "Men's Cardigans", description: "" },
];
let products = [];
try {
  [settings] = await rest("shop_settings?id=eq.1&select=instagram,processing_time");
  categories = await rest("shop_categories?select=slug,name,description&order=sort");
  products = await rest(
    "shop_products?active=eq.true&select=slug,name,subtitle,description,price_cents,sold_out,materials,updated_at,shop_product_images(url,sort)&order=sort",
  );
} catch (e) {
  console.warn(`prerender: couldn't load the catalog (${e.message}); writing static pages only.`);
}

const pages = [
  {
    path: "/",
    jsonLd: { "@context": "https://schema.org", "@type": "ClothingStore", name: NAME, url: `${SITE}/`, description: "Handmade knitted cardigans for women and men.", image: OG, sameAs: [`https://instagram.com/${settings.instagram}`] },
  },
  { path: "/shop", title: "Shop All Cardigans", description: "Shop handmade knitted cardigans for women and men — oversized, cropped, chunky, custom and matching couple sets." },
  ...categories.map((c) => ({ path: `/shop/${c.slug}`, title: c.name, description: c.description || `${c.name} — handmade by Marshmallow Knitwear.` })),
  { path: "/custom-orders", title: "Custom Orders", description: "Request a one-of-a-kind handmade cardigan — choose the style, colours and size, share reference photos, and we'll send you a personal quote." },
  { path: "/our-story", title: "Our Story", description: "Made by hand. Made to be loved. The story behind Marshmallow Knitwear's handmade cardigans." },
  { path: "/contact", title: "Contact & FAQ", description: "Questions about an order, sizing or a custom cardigan? Contact Marshmallow Knitwear — plus answers about payment, shipping and returns." },
  { path: "/track", title: "Track your order", description: "Look up your Marshmallow Knitwear order with your order number and email." },
  { path: "/policies/shipping", title: "Shipping Policy", description: "Shipping Policy — how and when your handmade order gets to you." },
  { path: "/policies/returns", title: "Returns Policy", description: "Returns Policy — our promise on handmade pieces." },
  { path: "/policies/privacy", title: "Privacy Policy", description: "Privacy Policy — what we collect, why, and how we look after it." },
  { path: "/policies/terms", title: "Terms of Service", description: "Terms of Service — the simple terms for shopping with us." },
  ...products.map((p) => {
    const imgs = [...(p.shop_product_images ?? [])].sort((a, b) => a.sort - b.sort).map((i) => ogImage(i.url));
    return {
      path: `/product/${p.slug}`,
      title: p.name,
      description: `${p.subtitle ? p.subtitle + ". " : ""}${p.description}`.slice(0, 158),
      image: imgs[0] ?? OG,
      type: "product",
      lastmod: p.updated_at,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        description: p.description,
        image: imgs,
        brand: { "@type": "Brand", name: NAME },
        material: p.materials || undefined,
        offers: {
          "@type": "Offer",
          url: `${SITE}/product/${p.slug}`,
          priceCurrency: "USD",
          price: (p.price_cents / 100).toFixed(2),
          availability: p.sold_out ? "https://schema.org/SoldOut" : "https://schema.org/MadeToOrder",
          itemCondition: "https://schema.org/NewCondition",
        },
      },
    };
  }),
];

for (const p of pages) {
  const html = page(shell, p);
  await write(p.path, html);
  // "/shop" is also a folder ("/shop/women"), so give it a folder index too in case the host redirects to "/shop/".
  if (p.path !== "/" && pages.some((q) => q.path.startsWith(`${p.path}/`))) await write(`${p.path}/index`, html);
}
// Everything else (cart, checkout, orders, admin, unknown links) gets the app shell; the app shows its own 404.
await writeFile(join(DIST, "404.html"), page(shell, { path: "/", noindex: true }).replace(/<link rel="canonical"[^>]*>\n\s*/, ""));

const today = new Date().toISOString().slice(0, 10);
await writeFile(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${esc(`${SITE}${p.path === "/" ? "/" : p.path}`)}</loc><lastmod>${(p.lastmod ?? today).slice(0, 10)}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`,
);
await writeFile(join(DIST, "robots.txt"), `User-agent: *\nDisallow: ${BASE}admin\nDisallow: ${BASE}checkout\nDisallow: ${BASE}order/\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(join(DIST, ".nojekyll"), "");
console.log(`prerender: ${pages.length} pages (${products.length} products), 404.html, sitemap.xml, robots.txt`);
