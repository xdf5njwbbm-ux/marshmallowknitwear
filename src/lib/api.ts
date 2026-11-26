import { supabase } from "./supabase";
import type { Category, Order, Product, Review, Settings } from "./types";

const PRODUCT_SELECT =
  "*, shop_product_colors(name, hex, sort), shop_product_images(id, url, alt, color, sort), shop_product_variants(size, color, sold_out, price_cents), shop_product_categories(category_slug)";

type Row = Record<string, unknown> & {
  shop_product_colors?: Product["colors"];
  shop_product_images?: Product["images"];
  shop_product_variants?: Product["variants"];
  shop_product_categories?: { category_slug: string }[];
};

export function toProduct(r: Row): Product {
  const { shop_product_colors, shop_product_images, shop_product_variants, shop_product_categories, ...p } = r;
  return {
    ...(p as unknown as Product),
    colors: [...(shop_product_colors ?? [])].sort((a, b) => a.sort - b.sort),
    images: [...(shop_product_images ?? [])].sort((a, b) => a.sort - b.sort),
    variants: shop_product_variants ?? [],
    categories: (shop_product_categories ?? []).map((c) => c.category_slug),
  };
}

async function check<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const api = {
  async catalog(): Promise<{ products: Product[]; categories: Category[]; settings: Settings }> {
    const [products, categories, settings] = await Promise.all([
      check(supabase.from("shop_products").select(PRODUCT_SELECT).eq("active", true).order("sort").order("created_at", { ascending: false })),
      check(supabase.from("shop_categories").select("*").order("sort")),
      check(supabase.from("shop_settings").select("*").eq("id", 1).single()),
    ]);
    return { products: (products as Row[]).map(toProduct), categories: categories as Category[], settings: settings as unknown as Settings };
  },

  async reviews(productId?: string): Promise<Review[]> {
    let q = supabase.from("shop_reviews").select("*").eq("approved", true).order("is_sample").order("created_at", { ascending: false });
    if (productId) q = q.eq("product_id", productId);
    return check(q.limit(productId ? 30 : 12)) as Promise<Review[]>;
  },

  submitReview: (p: { product_id: string; name: string; rating: number; title: string; body: string }) =>
    check(supabase.rpc("shop_submit_review", { p })),

  placeOrder: (items: { product_id: string; size: string; color: string; quantity: number }[], customer: Record<string, string>, cart: string | null) =>
    check(supabase.rpc("shop_place_order", { p_items: items, p_customer: customer, p_cart: cart })) as Promise<Order>,

  getOrder: (number: string, token: string) => check(supabase.rpc("shop_get_order", { p_number: number, p_token: token })) as Promise<Order | null>,

  lookupOrder: (number: string, email: string) => check(supabase.rpc("shop_lookup_order", { p_number: number, p_email: email })) as Promise<Order | null>,

  markSent: (number: string, token: string, payer: string) =>
    check(supabase.rpc("shop_mark_sent", { p_number: number, p_token: token, p_payer: payer })) as Promise<Order>,

  async saveCart(token: string, items: unknown[]): Promise<void> {
    const { error } = await supabase.rpc("shop_save_cart", { p_token: token, p_items: items });
    if (error) throw new Error(error.message);
  },

  submitMessage: (p: { name: string; email: string; subject: string; message: string }) => check(supabase.rpc("shop_submit_message", { p })),

  async uploadRequestImage(file: File): Promise<string> {
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `requests/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("shop-requests").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) throw new Error(error.message.includes("mime") ? "Please upload a JPG, PNG, WebP or HEIC image." : error.message);
    return path;
  },

  submitCustomRequest: (p: Record<string, unknown>) => check(supabase.rpc("shop_submit_custom_request", { p })),

  /** Sends the order confirmation email if the shop has email set up (Edge Function `shop-mail`). */
  async emailOrder(number: string, token: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("shop-mail", { body: { action: "order", number, token } });
      return !error && !!(data as { sent?: boolean })?.sent;
    } catch {
      return false;
    }
  },
};
