// Generates the starter catalogue (supabase/migrations/…_shop_seed.sql).
// Placeholder photos are free-licence Unsplash images; replace them with real photos in the admin.
// Run: npm run seed > supabase/migrations/20261126000300_shop_seed.sql
// Note: the script prints SQL to stdout.

const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;

type C = { name: string; hex: string };
type P = {
  slug: string; name: string; subtitle: string; price: number; compare?: number; audience: "women" | "men" | "unisex";
  badge?: "new" | "bestseller" | "limited" | "one-of-a-kind"; featured?: boolean; cats: string[]; colors: C[];
  images: [string, string][]; description: string; materials: string; details: string[]; processing?: string; sizes?: string[];
};

const CREAM = { name: "Cream", hex: "#F3EADB" };
const BLUSH = { name: "Blush", hex: "#EFC9C3" };
const SKY = { name: "Sky", hex: "#CFE0EC" };
const OAT = { name: "Oat", hex: "#E4D3B9" };
const SAGE = { name: "Sage", hex: "#B7C4A5" };
const COCOA = { name: "Cocoa", hex: "#6B4A3A" };

const CARE = "Hand wash cold with wool wash, or dry clean. Lay flat to dry and reshape while damp. Store folded, never hung.";

export const CATEGORIES = [
  { slug: "women", name: "Women's Cardigans", description: "Soft, romantic cardigans made to be lived in.", image: U("1610288311735-39b7facbd095"), sort: 1 },
  { slug: "men", name: "Men's Cardigans", description: "Easy, handsome knits with a quiet handmade character.", image: U("1786141251776-7d596304dc77"), sort: 2 },
  { slug: "oversized", name: "Oversized Cardigans", description: "Roomy, slouchy, wrap-yourself-up cardigans.", image: U("1588271968087-4c51abe05afc"), sort: 3 },
  { slug: "cropped", name: "Cropped Cardigans", description: "Shorter shapes that sit beautifully over dresses and high waists.", image: U("1553820691-51b6aa80cb7d"), sort: 4 },
  { slug: "chunky", name: "Chunky Knitwear", description: "Big stitches, bulky yarns, maximum cosiness.", image: U("1773747203076-27b247d32a4a"), sort: 5 },
  { slug: "custom", name: "Custom Handmade Pieces", description: "One-of-a-kind pieces and made-to-measure commissions.", image: U("1632649027900-389e810204e6"), sort: 6 },
  { slug: "couples", name: "Matching Couple Cardigans", description: "His & hers sets knitted from the same yarn lot.", image: U("1523523262500-ec13396518c6"), sort: 7 },
];

export const PRODUCTS: P[] = [
  {
    slug: "marshmallow-cloud-cardigan", name: "Marshmallow Cloud Cardigan", subtitle: "Our signature oversized knit", price: 148, audience: "women",
    badge: "bestseller", featured: true, cats: ["women", "oversized", "chunky"], colors: [CREAM, BLUSH, SKY],
    images: [["1588271968087-4c51abe05afc", "Model wearing a soft cream knit cardigan"], ["1773747310674-b42a55d72003", "Cream fuzzy knit hanging on a hanger"], ["1643016087636-69ebfe9c6450", "Close-up of the cloud-soft knit texture"]],
    description: "The cardigan that started it all. Knitted slowly by hand in a squishy, cloud-soft yarn, the Marshmallow Cloud has dropped shoulders, deep ribbed cuffs and an easy oversized shape you can wear open or wrapped. It feels like a hug from someone who loves you.",
    materials: "70% merino wool, 30% baby alpaca. Horn-effect buttons.",
    details: ["Hand-knitted from start to finish — about 30 hours per cardigan", "Oversized, relaxed fit with dropped shoulders", "Two deep patch pockets", "Five buttons, wear open or closed"],
  },
  {
    slug: "cozy-everyday-knit", name: "Cozy Everyday Knit", subtitle: "A lightweight layer for every day", price: 118, audience: "women",
    badge: "new", cats: ["women"], colors: [OAT, SAGE, COCOA],
    images: [["1629580628926-9fbdffb346b3", "Woman in a light knit cardigan outdoors"], ["1634653131107-ecc30d4501ac", "Stack of hand-knitted cardigans in soft colours"], ["1687275166011-5f5b7af0d568", "Sage green knit worn with a feather in hand"]],
    description: "A fine-gauge cardigan you will reach for every single morning. Light enough for spring evenings, warm enough for a cold office, and finished with tiny mother-of-pearl buttons for a little everyday romance.",
    materials: "100% extra-fine merino wool. Mother-of-pearl buttons.",
    details: ["Fine-gauge hand knit", "Regular fit that sits at the hip", "Ribbed hem and cuffs", "Seven small buttons"],
  },
  {
    slug: "oversized-teddy-cardigan", name: "The Oversized Teddy Cardigan", subtitle: "Bouclé texture, teddy-bear warmth", price: 164, audience: "women",
    badge: "bestseller", featured: true, cats: ["women", "oversized", "chunky"], colors: [{ name: "Caramel", hex: "#B98A5E" }, CREAM],
    images: [["1609999962569-f0f757358cf7", "Woman wearing a brown teddy-texture knit"], ["1557303696-f0a415dc1b3e", "Close-up of chunky brown knit"], ["1581497396202-5645e76a3a8e", "Person wrapped in a warm brown knit"]],
    description: "Knitted from a looped bouclé yarn that feels exactly like a teddy bear, this is our cosiest cardigan. Generous, enveloping and impossibly soft, with a wide shawl front and big pockets for cold hands.",
    materials: "Wool and alpaca bouclé blend. Coconut-shell buttons.",
    details: ["Teddy-texture bouclé, knitted by hand", "Very oversized — size down for a closer fit", "Shawl front, two front pockets", "Three oversized buttons"],
  },
  {
    slug: "sunday-morning-cardigan", name: "Sunday Morning Cardigan", subtitle: "Cropped, sunny and sweet", price: 112, audience: "women",
    cats: ["women", "cropped"], colors: [{ name: "Butter", hex: "#F3E3A6" }, BLUSH, SKY],
    images: [["1610288311735-39b7facbd095", "Woman wearing a butter-yellow knit cardigan"], ["1778661327316-a056b0e4df62", "Knitted cardigan styled with blue jeans"], ["1683315565563-f72590773805", "Folded knit with sunglasses on a white surface"]],
    description: "Pancakes, coffee and nowhere to be. The Sunday Morning is a cropped cardigan with puffed sleeves and a softly scalloped edge — perfect over a slip dress or your favourite high-waisted jeans.",
    materials: "Cotton and merino blend, lightweight. Shell buttons.",
    details: ["Cropped to sit at the natural waist", "Gently puffed sleeves", "Scalloped button band", "Six small buttons"],
  },
  {
    slug: "classic-mens-knit", name: "The Classic Men's Knit", subtitle: "The cardigan he'll wear for years", price: 138, audience: "men",
    badge: "bestseller", featured: true, cats: ["men"], colors: [COCOA, { name: "Charcoal", hex: "#4B4A48" }, OAT],
    images: [["1769636929261-e913ed023c83", "Smiling man wearing a dark knit cardigan"], ["1579206464424-7e43a81cadc1", "Grey button-up knit cardigan"], ["1631541909061-71e349d1f203", "Knit cardigan hanging on a hook at home"]],
    description: "A timeless V-neck cardigan with a tailored-but-relaxed fit, knitted by hand in a durable, slightly rustic wool. Wear it over a tee on the weekend or a shirt on a Monday — it only gets better with age.",
    materials: "100% British wool. Leather-look buttons.",
    details: ["Classic V-neck", "Regular fit, true to size", "Two welt pockets", "Five buttons"],
  },
  {
    slug: "blush-pink-handmade-cardigan", name: "Blush Pink Handmade Cardigan", subtitle: "Soft pink, softer knit", price: 126, audience: "women",
    badge: "new", featured: true, cats: ["women", "cropped"], colors: [{ name: "Blush Pink", hex: "#EBB8B2" }],
    images: [["1789845137149-5c96e280c1a1", "Folded knit cardigans in grey, cream and blush pink"], ["1771170223514-0c7030d41308", "Pink tulips resting on a knit cardigan"], ["1553820691-51b6aa80cb7d", "Woman sitting in a pastel knit cardigan"]],
    description: "Our most romantic piece. A slightly cropped cardigan in the softest blush pink, with a little cable down each front and pearl buttons. It photographs like a dream and feels even better.",
    materials: "Merino wool and cashmere blend. Pearl-effect buttons.",
    details: ["Delicate cable detail down each front", "Slightly cropped", "Ribbed collar, cuffs and hem", "Pearl-effect buttons"],
  },
  {
    slug: "matching-his-and-hers-cardigans", name: "Matching His & Hers Cardigans", subtitle: "A set of two, knitted from the same yarn", price: 268, compare: 296, audience: "unisex",
    featured: true, cats: ["couples"], colors: [{ name: "Cream & Cocoa", hex: "#D9C3A9" }, { name: "Sage & Oat", hex: "#C7CCB0" }, { name: "Blush & Sky", hex: "#E2CFD3" }],
    images: [["1523523262500-ec13396518c6", "Couple hugging, both wearing knitwear"], ["1759229875274-bd920070ceef", "Couple in matching cosy knits in a library"], ["1770872937971-f6df56da0933", "Smiling couple in a cosy setting"]],
    description: "Two cardigans, one story. Knitted from the same yarn lot so the colours match perfectly — one in a classic men's cut, one in a softer women's cut. Choose the size for the first cardigan here; we'll email you to confirm the second size after you order.",
    materials: "Merino wool. Each cardigan has its own buttons, chosen to suit its cut.",
    details: ["A set of two hand-knitted cardigans", "Same yarn lot for a perfect colour match", "Each piece sized individually — we'll confirm sizes with you", "Gift-wrapped together on request"],
    processing: "3–4 weeks",
  },
  {
    slug: "fisherman-cable-cardigan", name: "The Fisherman Cable Cardigan", subtitle: "Heritage cables, hand-knitted", price: 172, audience: "men",
    badge: "new", cats: ["men", "chunky"], colors: [{ name: "Ecru", hex: "#EDE4D3" }, { name: "Moss", hex: "#7C8C6A" }],
    images: [["1786141251776-7d596304dc77", "Young man wearing a cream knit cardigan outdoors"], ["1598871956091-1b9681ae2bf0", "White and brown knit textures"], ["1786141251777-c48309702838", "Man in a cardigan standing by a stack of logs"]],
    description: "Inspired by traditional fishermen's knits: rope cables, honeycomb panels and a weight that keeps the wind out. This is a cardigan to wear on long walks and hand down one day.",
    materials: "Undyed and naturally dyed wool, 100%. Wooden toggle buttons.",
    details: ["Traditional cable and honeycomb panels", "Heavyweight chunky knit", "Regular fit with room to layer", "Wooden buttons"],
    processing: "3–4 weeks",
  },
  {
    slug: "campfire-shawl-collar-cardigan", name: "Campfire Shawl-Collar Cardigan", subtitle: "Big collar, warm heart", price: 158, audience: "men",
    cats: ["men", "chunky"], colors: [{ name: "Toffee", hex: "#A0714F" }, { name: "Forest", hex: "#4E5E47" }],
    images: [["1776713159127-673c73fd397a", "Man wearing a cardigan in a field"], ["1758981400268-1181291b9503", "Brown knitted cardigan with a white Nordic pattern"], ["1762390849209-dc7099ae43e0", "Young man in a cardigan in the woods"]],
    description: "A generous shawl collar you can turn up against the cold, a sturdy knit and a fit made for flannel shirts and evenings by the fire.",
    materials: "Wool and alpaca blend. Leather-look buttons.",
    details: ["Thick shawl collar", "Relaxed fit", "Two patch pockets", "Four buttons"],
  },
  {
    slug: "pastel-patchwork-cardigan", name: "Pastel Patchwork Cardigan", subtitle: "A one-of-a-kind piece", price: 189, audience: "women",
    badge: "one-of-a-kind", cats: ["custom", "women"], colors: [{ name: "Pastel Mix", hex: "#E6D6E8" }],
    images: [["1760127537832-0bae1e09bfbb", "Green knit with a white daisy pattern"], ["1773747203076-27b247d32a4a", "Close-up of a chunky knit in ombre colours"], ["1641060889144-1cc91e6871ce", "Pile of pastel yarn balls"]],
    description: "Squares of pink, mint, butter and sky, each knitted separately and joined by hand. Because every patchwork is arranged by eye, no two are ever the same — yours will be the only one in the world.",
    materials: "Merino and cotton blend in six pastel shades.",
    details: ["Hand-knitted squares, joined by hand", "Every colour arrangement is unique", "Relaxed fit", "Mismatched vintage-style buttons"],
    processing: "3–4 weeks",
  },
  {
    slug: "little-cloud-cropped-cardigan", name: "Little Cloud Cropped Cardigan", subtitle: "Light as air, sweet as candy", price: 98, audience: "women",
    badge: "new", cats: ["women", "cropped"], colors: [{ name: "Lavender", hex: "#D9CFE8" }, { name: "Mint", hex: "#CFE5D6" }, CREAM],
    images: [["1629821713984-e7b7aa53a845", "Woman in a white cardigan sitting on a swing"], ["1615310748170-29d7088865ad", "Sunglasses resting on a white knit"], ["1629821714384-e474d42099ff", "Woman in a white cardigan sitting on a beach"]],
    description: "A short, fluffy cardigan in candy-floss colours. Throw it over a sundress on summer evenings or layer it over a turtleneck in winter.",
    materials: "Mohair and silk blend, featherlight. Shell buttons.",
    details: ["Featherlight fluffy mohair", "Cropped, boxy shape", "Five small buttons", "Our most affordable piece"],
  },
  {
    slug: "weekend-grandpa-cardigan", name: "The Weekend Grandpa Cardigan", subtitle: "Oversized, comfy, a little vintage", price: 142, audience: "men",
    cats: ["men", "oversized"], colors: [{ name: "Oatmeal", hex: "#DCCDB4" }, { name: "Rust", hex: "#A65F3E" }],
    images: [["1762390849345-ffa8d7c97314", "Young man in casual knitwear in a forest"], ["1768745587814-f26d28100ec4", "Bearded man wearing an open-knit sweater"], ["1536992266094-82847e1fd431", "Grey knit laid flat"]],
    description: "The cardigan you steal from your grandpa's wardrobe — except this one is new, handmade and fits you. Loose, comfortable and full of character.",
    materials: "Wool and cotton blend. Toggle buttons.",
    details: ["Oversized, slouchy fit", "Contrast-tipped pockets", "Ribbed shawl front", "Four toggle buttons"],
  },
  {
    slug: "river-stone-cardigan", name: "River Stone Cardigan", subtitle: "Chunky, calm and grounding", price: 154, audience: "women",
    cats: ["women", "chunky", "oversized"], colors: [{ name: "Stone", hex: "#B9B5AE" }, OAT],
    images: [["1574201635302-388dd92a4c3f", "Person wearing a grey chunky knit"], ["1679847628912-4c3e7402abc7", "Crocheted cardigan hanging on a wall next to a plant"], ["1672380300750-6294c5614695", "Woman wearing a light knit and trousers"]],
    description: "A chunky long-line cardigan in a soft stone grey that goes with absolutely everything. The thick seed-stitch texture is calming to wear — and to look at.",
    materials: "Chunky merino wool. Matte resin buttons.",
    details: ["Seed-stitch chunky knit", "Long-line, hip-to-thigh length", "Two deep pockets", "Three buttons"],
  },
  {
    slug: "cherry-seaside-cardigan", name: "Cherry Seaside Cardigan", subtitle: "A pop of colour for breezy days", price: 136, audience: "women",
    cats: ["women"], colors: [{ name: "Cherry", hex: "#B5483F" }, CREAM],
    images: [["1631669991586-0465d15a41f5", "Smiling woman in a red cardigan by the ocean"], ["1616873494464-4cc51793567f", "Woman in a red knit and white trousers"], ["1634901581982-6b408cf4226a", "Three knits in different colours laid on a bed"]],
    description: "Bright, cheerful and made for salty air. A relaxed crew-neck cardigan in a cotton-wool blend that breathes on warm days and keeps the chill off when the sun goes down.",
    materials: "Cotton and wool blend. Contrast cream buttons.",
    details: ["Crew neck", "Relaxed fit", "Contrast buttons", "Breathable cotton blend"],
  },
  {
    slug: "heirloom-made-to-measure-cardigan", name: "Heirloom Made-to-Measure Cardigan", subtitle: "Knitted to your exact measurements", price: 220, audience: "unisex",
    badge: "limited", cats: ["custom"], colors: [{ name: "Your choice of colour", hex: "#E8DCCB" }],
    images: [["1632649027900-389e810204e6", "Hands knitting a new piece"], ["1703069920020-d79898aa04cf", "A knitted piece with knitting needles"], ["1773747203069-50170091264e", "Knitting with warm-toned yarn and metal needles"]],
    description: "A cardigan made only for you. After you order, we'll email you to choose your yarn and colour and take your measurements, then knit your cardigan from scratch. For fully custom designs, matching sets or special ideas, use our Custom Orders page.",
    materials: "Your choice from our merino, alpaca and cotton yarns.",
    details: ["Made to your measurements", "Choose yarn, colour, buttons and length", "Photos of your piece while it's being knitted", "Limited spots each month"],
    processing: "4–6 weeks",
  },
];

// Sample reviews — clearly marked as samples on the site until real reviews come in.
export const REVIEWS: { product: string; rating: number; title: string; body: string; photo?: string }[] = [
  { product: "marshmallow-cloud-cardigan", rating: 5, title: "Sample review: softest thing I own", body: "This is an example of how a customer review will look on this page. Real reviews from Marshmallow Knitwear customers will replace these samples.", photo: "1588271968087-4c51abe05afc" },
  { product: "oversized-teddy-cardigan", rating: 5, title: "Sample review: like wearing a teddy bear", body: "Example review text — once customers start sharing their experiences, their words and photos will appear here instead.", photo: "1609999962569-f0f757358cf7" },
  { product: "classic-mens-knit", rating: 5, title: "Sample review: worn every weekend", body: "A sample review showing the layout for men's pieces. Genuine reviews will be added after the first orders arrive." },
  { product: "matching-his-and-hers-cardigans", rating: 5, title: "Sample review: perfect anniversary gift", body: "Sample content: this is where couples will share photos of their matching cardigans.", photo: "1523523262500-ec13396518c6" },
  { product: "sunday-morning-cardigan", rating: 4, title: "Sample review: so pretty with dresses", body: "An example of a four-star review. Real reviews are moderated and published only with the customer's permission." },
  { product: "blush-pink-handmade-cardigan", rating: 5, title: "Sample review: the colour is dreamy", body: "Placeholder review — this shows how a review with a photo looks. It isn't from a real customer.", photo: "1789845137149-5c96e280c1a1" },
];

// ---------------------------------------------------------------- SQL

const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const arr = (a: string[]) => `array[${a.map(q).join(", ")}]::text[]`;

const out: string[] = [
  "-- Marshmallow Knitwear — starter catalogue (generated by scripts/seed-sql.ts).",
  "-- Placeholder photos are free-licence Unsplash images; replace them with your own in the admin.",
  "",
];
for (const c of CATEGORIES) out.push(`insert into public.shop_categories (slug, name, description, image, sort) values (${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${q(c.image)}, ${c.sort}) on conflict (slug) do nothing;`);
out.push("");
PRODUCTS.forEach((p, i) => {
  const sizes = p.sizes ?? ["XS", "S", "M", "L", "XL", "XXL"];
  out.push(`with p as (
  insert into public.shop_products (slug, name, subtitle, description, price_cents, compare_at_cents, audience, badge, sizes, materials, care, details, processing_time, featured, sort)
  values (${q(p.slug)}, ${q(p.name)}, ${q(p.subtitle)}, ${q(p.description)}, ${p.price * 100}, ${p.compare ? p.compare * 100 : "null"}, ${q(p.audience)}, ${q(p.badge ?? null)}, ${arr(sizes)}, ${q(p.materials)}, ${q(CARE)}, ${arr(p.details)}, ${q(p.processing ?? null)}, ${p.featured ? "true" : "false"}, ${i})
  on conflict (slug) do nothing returning id
), cats as (
  insert into public.shop_product_categories (product_id, category_slug) select p.id, c from p, unnest(${arr(p.cats)}) c returning 1
), cols as (
  insert into public.shop_product_colors (product_id, name, hex, sort) select p.id, x.name, x.hex, x.ord - 1 from p,
    (values ${p.colors.map((c, k) => `(${q(c.name)}, ${q(c.hex)}, ${k + 1})`).join(", ")}) as x(name, hex, ord) returning 1
), imgs as (
  insert into public.shop_product_images (product_id, url, alt, sort) select p.id, x.url, x.alt, x.ord - 1 from p,
    (values ${p.images.map(([id, alt], k) => `(${q(U(id))}, ${q(alt)}, ${k + 1})`).join(", ")}) as x(url, alt, ord) returning 1
)
insert into public.shop_product_variants (product_id, size, color)
select p.id, s, c from p, unnest(${arr(sizes)}) s, unnest(${arr(p.colors.map((c) => c.name))}) c;`);
});
out.push("");
for (const r of REVIEWS)
  out.push(`insert into public.shop_reviews (product_id, name, location, rating, title, body, photo_url, is_sample, approved)
select id, 'Sample reviewer', 'Example review', ${r.rating}, ${q(r.title)}, ${q(r.body)}, ${q(r.photo ? U(r.photo) : null)}, true, true from public.shop_products where slug = ${q(r.product)};`);

console.log(out.join("\n"));
