-- Marshmallow Knitwear — store schema.
-- Lives in the shared Supabase project next to another app, so every object is prefixed shop_.
-- Customers never write tables directly: checkout, lookups and forms go through the
-- security-definer functions below, which validate input and recompute prices on the server.
-- Admins (rows in shop_admins) manage everything through RLS policies and admin functions.

-- ---------------------------------------------------------------- admins & secrets

create table public.shop_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.shop_admins enable row level security;

-- Private values only functions can read (e.g. the one-time owner setup code).
create table public.shop_secrets (
  key text primary key,
  value text not null
);
alter table public.shop_secrets enable row level security;

create or replace function public.shop_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shop_admins a where a.user_id = auth.uid());
$$;

create policy "admins see admins" on public.shop_admins for select using (public.shop_is_admin());

-- ---------------------------------------------------------------- settings

create table public.shop_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Marshmallow Knitwear',
  announcement text not null default 'Handcrafted with love • Every stitch tells a story',
  venmo_username text not null default 'VENMO_USERNAME',
  venmo_link text,
  venmo_logo_url text,
  shipping_flat_cents int not null default 900 check (shipping_flat_cents >= 0),
  free_shipping_over_cents int check (free_shipping_over_cents is null or free_shipping_over_cents >= 0),
  processing_time text not null default '2–3 weeks',
  contact_email text not null default 'hello@marshmallowknitwear.com',
  instagram text not null default 'marshmallowknitwear',
  phone text,
  hero_heading text not null default 'Handmade With Love. Worn With Comfort.',
  hero_text text not null default 'Discover thoughtfully handcrafted knitwear designed to bring warmth, personality, and comfort to every wardrobe.',
  hero_image_women text,
  hero_image_men text,
  home jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.shop_settings enable row level security;
create policy "settings are public" on public.shop_settings for select using (true);
create policy "admins edit settings" on public.shop_settings for update using (public.shop_is_admin()) with check (public.shop_is_admin());
insert into public.shop_settings (id, free_shipping_over_cents) values (1, 15000);

-- ---------------------------------------------------------------- catalog

create table public.shop_categories (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null default '',
  image text,
  sort int not null default 0
);
alter table public.shop_categories enable row level security;
create policy "categories are public" on public.shop_categories for select using (true);
create policy "admins manage categories" on public.shop_categories for all using (public.shop_is_admin()) with check (public.shop_is_admin());

create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(name) between 2 and 120),
  subtitle text not null default '',
  description text not null default '',
  price_cents int not null check (price_cents > 0),
  compare_at_cents int check (compare_at_cents is null or compare_at_cents > 0),
  audience text not null default 'unisex' check (audience in ('women', 'men', 'unisex')),
  badge text check (badge in ('new', 'bestseller', 'limited', 'one-of-a-kind')),
  sizes text[] not null default array['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  materials text not null default '',
  care text not null default '',
  details text[] not null default '{}',
  processing_time text,
  featured boolean not null default false,
  sold_out boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shop_products enable row level security;
create policy "active products are public" on public.shop_products for select using (active or public.shop_is_admin());
create policy "admins manage products" on public.shop_products for all using (public.shop_is_admin()) with check (public.shop_is_admin());

create table public.shop_product_categories (
  product_id uuid not null references public.shop_products (id) on delete cascade,
  category_slug text not null references public.shop_categories (slug) on delete cascade on update cascade,
  primary key (product_id, category_slug)
);
alter table public.shop_product_categories enable row level security;
create policy "product categories are public" on public.shop_product_categories for select using (true);
create policy "admins manage product categories" on public.shop_product_categories for all using (public.shop_is_admin()) with check (public.shop_is_admin());

create table public.shop_product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products (id) on delete cascade,
  name text not null,
  hex text not null default '#e8dccb' check (hex ~ '^#[0-9a-fA-F]{6}$'),
  sort int not null default 0,
  unique (product_id, name)
);
alter table public.shop_product_colors enable row level security;
create policy "colors are public" on public.shop_product_colors for select using (true);
create policy "admins manage colors" on public.shop_product_colors for all using (public.shop_is_admin()) with check (public.shop_is_admin());

create table public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  color text,
  sort int not null default 0
);
alter table public.shop_product_images enable row level security;
create policy "images are public" on public.shop_product_images for select using (true);
create policy "admins manage images" on public.shop_product_images for all using (public.shop_is_admin()) with check (public.shop_is_admin());

-- One row per size × colour, so single combinations can be marked sold out.
create table public.shop_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products (id) on delete cascade,
  size text not null,
  color text not null,
  sold_out boolean not null default false,
  price_cents int check (price_cents is null or price_cents > 0),
  unique (product_id, size, color)
);
alter table public.shop_product_variants enable row level security;
create policy "variants are public" on public.shop_product_variants for select using (true);
create policy "admins manage variants" on public.shop_product_variants for all using (public.shop_is_admin()) with check (public.shop_is_admin());

-- ---------------------------------------------------------------- customers & carts

create table public.shop_customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shop_customers enable row level security;
create policy "admins see customers" on public.shop_customers for select using (public.shop_is_admin());

-- Carts live in the browser; a copy is kept here (by an anonymous token) so the shop can see open carts.
create table public.shop_carts (
  token uuid primary key,
  email text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.shop_carts enable row level security;
create policy "admins see carts" on public.shop_carts for select using (public.shop_is_admin());

create table public.shop_cart_items (
  id bigint generated always as identity primary key,
  cart_token uuid not null references public.shop_carts (token) on delete cascade,
  product_id uuid not null references public.shop_products (id) on delete cascade,
  size text not null,
  color text not null,
  quantity int not null check (quantity between 1 and 10)
);
alter table public.shop_cart_items enable row level security;
create policy "admins see cart items" on public.shop_cart_items for select using (public.shop_is_admin());

-- ---------------------------------------------------------------- orders

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid references public.shop_customers (id) on delete set null,
  email text not null,
  name text not null,
  phone text,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'payment_confirmed', 'preparing', 'production', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'awaiting' check (payment_status in ('awaiting', 'verified', 'refunded')),
  subtotal_cents int not null,
  shipping_cents int not null,
  total_cents int not null,
  customer_note text,
  admin_notes text,
  lookup_token uuid not null default gen_random_uuid(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shop_orders_created on public.shop_orders (created_at desc);
create index shop_orders_email on public.shop_orders (email);
alter table public.shop_orders enable row level security;
create policy "admins see orders" on public.shop_orders for select using (public.shop_is_admin());
create policy "admins edit order notes" on public.shop_orders for update using (public.shop_is_admin()) with check (public.shop_is_admin());

create table public.shop_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  product_id uuid references public.shop_products (id) on delete set null,
  product_name text not null,
  product_slug text not null,
  image text,
  size text not null,
  color text not null,
  quantity int not null check (quantity between 1 and 10),
  unit_price_cents int not null,
  line_total_cents int not null
);
alter table public.shop_order_items enable row level security;
create policy "admins see order items" on public.shop_order_items for select using (public.shop_is_admin());

-- Shipping information for each order.
create table public.shop_shipments (
  order_id uuid primary key references public.shop_orders (id) on delete cascade,
  name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  zip text not null,
  country text not null default 'US',
  carrier text,
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz
);
alter table public.shop_shipments enable row level security;
create policy "admins see shipments" on public.shop_shipments for select using (public.shop_is_admin());

-- Venmo payments: created "pending" with each order; only an admin can verify one.
create table public.shop_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  method text not null default 'venmo',
  amount_cents int not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'refunded')),
  reference text,
  payer text,
  note text,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.shop_payments enable row level security;
create policy "admins see payments" on public.shop_payments for select using (public.shop_is_admin());

create table public.shop_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  status text not null,
  note text,
  by_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.shop_order_events enable row level security;
create policy "admins see order events" on public.shop_order_events for select using (public.shop_is_admin());

-- ---------------------------------------------------------------- requests, messages, reviews

create table public.shop_custom_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  style text not null,
  color text not null default '',
  size text not null default '',
  fit text not null default '',
  couple boolean not null default false,
  description text not null,
  image_paths text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'accepted', 'declined', 'done')),
  quote_cents int,
  admin_notes text,
  created_at timestamptz not null default now()
);
alter table public.shop_custom_requests enable row level security;
create policy "admins manage custom requests" on public.shop_custom_requests for all using (public.shop_is_admin()) with check (public.shop_is_admin());

create table public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.shop_messages enable row level security;
create policy "admins manage messages" on public.shop_messages for all using (public.shop_is_admin()) with check (public.shop_is_admin());

create table public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.shop_products (id) on delete cascade,
  name text not null,
  location text,
  rating int not null check (rating between 1 and 5),
  title text not null default '',
  body text not null,
  photo_url text,
  is_sample boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.shop_reviews enable row level security;
create policy "approved reviews are public" on public.shop_reviews for select using (approved or public.shop_is_admin());
create policy "admins manage reviews" on public.shop_reviews for all using (public.shop_is_admin()) with check (public.shop_is_admin());

-- ---------------------------------------------------------------- touch updated_at

create or replace function public.shop_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger shop_products_touch before update on public.shop_products for each row execute function public.shop_touch();
create trigger shop_orders_touch before update on public.shop_orders for each row execute function public.shop_touch();
create trigger shop_settings_touch before update on public.shop_settings for each row execute function public.shop_touch();
