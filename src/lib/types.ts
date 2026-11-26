export type Audience = "women" | "men" | "unisex";
export type Badge = "new" | "bestseller" | "limited" | "one-of-a-kind";

export type Color = { name: string; hex: string; sort: number };
export type ProductImage = { id?: string; url: string; alt: string; color: string | null; sort: number };
export type Variant = { size: string; color: string; sold_out: boolean; price_cents: number | null };

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  audience: Audience;
  badge: Badge | null;
  sizes: string[];
  materials: string;
  care: string;
  details: string[];
  processing_time: string | null;
  featured: boolean;
  sold_out: boolean;
  active: boolean;
  sort: number;
  created_at: string;
  categories: string[];
  colors: Color[];
  images: ProductImage[];
  variants: Variant[];
};

export type Category = { slug: string; name: string; description: string; image: string | null; sort: number };

export type Settings = {
  store_name: string;
  announcement: string;
  venmo_username: string;
  venmo_link: string | null;
  venmo_logo_url: string | null;
  shipping_flat_cents: number;
  free_shipping_over_cents: number | null;
  processing_time: string;
  contact_email: string;
  instagram: string;
  phone: string | null;
  hero_heading: string;
  hero_text: string;
  hero_image_women: string | null;
  hero_image_men: string | null;
  home: Record<string, unknown>;
};

export type Review = {
  id: string;
  product_id: string | null;
  name: string;
  location: string | null;
  rating: number;
  title: string;
  body: string;
  photo_url: string | null;
  is_sample: boolean;
  approved: boolean;
  created_at: string;
};

export type OrderStatus = "awaiting_payment" | "payment_confirmed" | "preparing" | "production" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  product_id: string | null;
  name: string;
  slug: string;
  image: string | null;
  size: string;
  color: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type Order = {
  id: string;
  number: string;
  token: string;
  status: OrderStatus;
  payment_status: "awaiting" | "verified" | "refunded";
  created_at: string;
  paid_at: string | null;
  email: string;
  name: string;
  phone: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  customer_note: string | null;
  items: OrderItem[];
  shipping: {
    name: string; line1: string; line2: string | null; city: string; state: string; zip: string; country: string;
    carrier: string | null; tracking_number: string | null; tracking_url: string | null; shipped_at: string | null; delivered_at: string | null;
  } | null;
  events: { status: string; note: string | null; created_at: string }[];
  venmo_username: string;
  venmo_link: string | null;
  // admin only
  admin_notes?: string | null;
  payments?: { id: string; amount_cents: number; status: string; reference: string | null; payer: string | null; note: string | null; verified_at: string | null; created_at: string }[];
};

export type CartLine = { key: string; product_id: string; slug: string; size: string; color: string; quantity: number };
