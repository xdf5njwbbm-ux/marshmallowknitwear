import { supabase } from "../lib/supabase";
import { toProduct } from "../lib/api";
import type { Category, Order, OrderStatus, Product, Review, Settings } from "../lib/types";

async function run<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export type OrderRow = {
  id: string;
  number: string;
  name: string;
  email: string;
  status: OrderStatus;
  payment_status: Order["payment_status"];
  total_cents: number;
  created_at: string;
  paid_at: string | null;
  shop_order_items: { quantity: number }[];
  shop_order_events: { note: string | null }[];
};

export type CustomRequest = {
  id: string; name: string; email: string; style: string; color: string; size: string; fit: string; couple: boolean; description: string;
  image_paths: string[]; status: "new" | "reviewing" | "quoted" | "accepted" | "declined" | "done"; quote_cents: number | null; admin_notes: string | null; created_at: string;
};
export type Message = { id: string; name: string; email: string; subject: string; message: string; handled: boolean; created_at: string };

const PRODUCT_SELECT =
  "*, shop_product_colors(name, hex, sort), shop_product_images(id, url, alt, color, sort), shop_product_variants(size, color, sold_out, price_cents), shop_product_categories(category_slug)";

export const admin = {
  isAdmin: () => run(supabase.rpc("shop_is_admin")) as Promise<boolean>,
  claim: (code: string) => run(supabase.rpc("shop_claim_admin", { p_code: code })) as Promise<boolean>,

  orders: () =>
    run(
      supabase
        .from("shop_orders")
        .select("id, number, name, email, status, payment_status, total_cents, created_at, paid_at, shop_order_items(quantity), shop_order_events(note)")
        .order("created_at", { ascending: false })
        .limit(500),
    ) as Promise<OrderRow[]>,
  order: (id: string) => run(supabase.rpc("shop_admin_order", { p_order: id })) as Promise<Order>,
  verify: (id: string, amount_cents: number, reference: string, payer: string, note: string) =>
    run(supabase.rpc("shop_admin_verify_payment", { p_order: id, p_amount_cents: amount_cents, p_reference: reference, p_payer: payer, p_note: note })) as Promise<Order>,
  resetPayment: (id: string, note: string) => run(supabase.rpc("shop_admin_reset_payment", { p_order: id, p_note: note })) as Promise<Order>,
  setStatus: (id: string, status: OrderStatus, note: string) => run(supabase.rpc("shop_admin_set_status", { p_order: id, p_status: status, p_note: note })) as Promise<Order>,
  setTracking: (id: string, carrier: string, number: string, url: string) =>
    run(supabase.rpc("shop_admin_set_tracking", { p_order: id, p_carrier: carrier, p_number: number, p_url: url })) as Promise<Order>,
  saveNotes: (id: string, notes: string) => run(supabase.from("shop_orders").update({ admin_notes: notes || null }).eq("id", id).select("id")),

  async products(): Promise<Product[]> {
    const rows = await run(supabase.from("shop_products").select(PRODUCT_SELECT).order("sort").order("created_at", { ascending: false }));
    return (rows as Parameters<typeof toProduct>[0][]).map(toProduct);
  },
  saveProduct: (p: Record<string, unknown>) => run(supabase.rpc("shop_admin_save_product", { p })) as Promise<string>,
  deleteProduct: (id: string) => run(supabase.rpc("shop_admin_delete_product", { p_id: id })),
  quickProduct: (id: string, patch: Partial<Pick<Product, "featured" | "sold_out" | "active">>) => run(supabase.from("shop_products").update(patch).eq("id", id).select("id")),

  async uploadProductPhoto(file: File): Promise<string> {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
    const path = `products/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("shop-products").upload(path, file, { contentType: file.type || "image/jpeg", cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return supabase.storage.from("shop-products").getPublicUrl(path).data.publicUrl;
  },
  async uploadSettingsImage(file: File): Promise<string> {
    const path = `site/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await supabase.storage.from("shop-products").upload(path, file, { contentType: file.type || "image/jpeg", cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return supabase.storage.from("shop-products").getPublicUrl(path).data.publicUrl;
  },

  requests: () => run(supabase.from("shop_custom_requests").select("*").order("created_at", { ascending: false }).limit(300)) as Promise<CustomRequest[]>,
  updateRequest: (id: string, patch: Partial<CustomRequest>) => run(supabase.from("shop_custom_requests").update(patch).eq("id", id).select("id")),
  async requestImageUrls(paths: string[]): Promise<string[]> {
    if (!paths.length) return [];
    const { data, error } = await supabase.storage.from("shop-requests").createSignedUrls(paths, 60 * 60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => d.signedUrl ?? "").filter(Boolean);
  },

  messages: () => run(supabase.from("shop_messages").select("*").order("created_at", { ascending: false }).limit(300)) as Promise<Message[]>,
  updateMessage: (id: string, handled: boolean) => run(supabase.from("shop_messages").update({ handled }).eq("id", id).select("id")),
  deleteMessage: (id: string) => run(supabase.from("shop_messages").delete().eq("id", id)),

  reviews: () => run(supabase.from("shop_reviews").select("*").order("approved").order("created_at", { ascending: false }).limit(300)) as Promise<Review[]>,
  updateReview: (id: string, patch: Partial<Review>) => run(supabase.from("shop_reviews").update(patch).eq("id", id).select("id")),
  deleteReview: (id: string) => run(supabase.from("shop_reviews").delete().eq("id", id)),

  settings: () => run(supabase.from("shop_settings").select("*").eq("id", 1).single()) as unknown as Promise<Settings>,
  saveSettings: (patch: Partial<Settings>) => run(supabase.from("shop_settings").update(patch).eq("id", 1).select("id")),
  categories: () => run(supabase.from("shop_categories").select("*").order("sort")) as Promise<Category[]>,
  saveCategory: (c: Category) => run(supabase.from("shop_categories").upsert(c).select("slug")),
  deleteCategory: (slug: string) => run(supabase.from("shop_categories").delete().eq("slug", slug)),
};

export const customerSaysPaid = (o: Pick<OrderRow, "shop_order_events">) => o.shop_order_events.some((e) => e.note?.startsWith("Customer reported"));
