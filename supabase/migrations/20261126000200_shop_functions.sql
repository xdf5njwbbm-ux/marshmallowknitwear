-- Marshmallow Knitwear — checkout, lookups, forms and admin actions.
-- All customer-facing writes go through these functions. Prices, shipping and totals are
-- always recomputed here from the database; nothing the browser sends is trusted.

-- ---------------------------------------------------------------- helpers

create or replace function public.shop_err(msg text) returns void
language plpgsql as $$ begin raise exception '%', msg using errcode = '22023'; end $$;

create or replace function public.shop_valid_email(e text) returns boolean
language sql immutable as $$ select e ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and length(e) <= 200 $$;

-- Full order as JSON (internal: callers check access first).
create or replace function public.shop_order_json(p_order uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.number, 'token', o.lookup_token, 'status', o.status, 'payment_status', o.payment_status,
    'created_at', o.created_at, 'paid_at', o.paid_at, 'email', o.email, 'name', o.name, 'phone', o.phone,
    'subtotal_cents', o.subtotal_cents, 'shipping_cents', o.shipping_cents, 'total_cents', o.total_cents,
    'customer_note', o.customer_note,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'product_id', i.product_id, 'name', i.product_name, 'slug', i.product_slug, 'image', i.image, 'size', i.size,
        'color', i.color, 'quantity', i.quantity, 'unit_price_cents', i.unit_price_cents, 'line_total_cents', i.line_total_cents) order by i.id)
      from public.shop_order_items i where i.order_id = o.id), '[]'::jsonb),
    'shipping', (select to_jsonb(s) - 'order_id' from public.shop_shipments s where s.order_id = o.id),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'created_at', e.created_at) order by e.id)
      from public.shop_order_events e where e.order_id = o.id), '[]'::jsonb),
    'venmo_username', (select st.venmo_username from public.shop_settings st where st.id = 1),
    'venmo_link', (select st.venmo_link from public.shop_settings st where st.id = 1)
  )
  from public.shop_orders o where o.id = p_order;
$$;
revoke execute on function public.shop_order_json(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- checkout

create or replace function public.shop_place_order(p_items jsonb, p_customer jsonb, p_cart uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  st public.shop_settings;
  v_email text := lower(btrim(coalesce(p_customer ->> 'email', '')));
  v_name text := btrim(coalesce(p_customer ->> 'name', ''));
  v_phone text := nullif(btrim(coalesce(p_customer ->> 'phone', '')), '');
  v_line1 text := btrim(coalesce(p_customer ->> 'line1', ''));
  v_line2 text := nullif(btrim(coalesce(p_customer ->> 'line2', '')), '');
  v_city text := btrim(coalesce(p_customer ->> 'city', ''));
  v_state text := upper(btrim(coalesce(p_customer ->> 'state', '')));
  v_zip text := btrim(coalesce(p_customer ->> 'zip', ''));
  v_note text := nullif(btrim(coalesce(p_customer ->> 'note', '')), '');
  it jsonb;
  p public.shop_products;
  v_qty int;
  v_size text;
  v_color text;
  v_price int;
  v_image text;
  v_variant public.shop_product_variants;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal int := 0;
  v_shipping int;
  v_number text;
  v_customer uuid;
  v_order uuid;
  v_token uuid;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  k int;
begin
  -- the customer
  if length(v_name) < 2 or length(v_name) > 100 then perform public.shop_err('Please enter your full name.'); end if;
  if not public.shop_valid_email(v_email) then perform public.shop_err('Please enter a valid email address.'); end if;
  if v_phone is not null and (length(v_phone) > 30 or v_phone !~ '^[0-9+().\s-]{7,}$') then perform public.shop_err('Please check your phone number.'); end if;
  if length(v_line1) < 3 or length(v_line1) > 200 then perform public.shop_err('Please enter your street address.'); end if;
  if v_line2 is not null and length(v_line2) > 100 then perform public.shop_err('The apartment field is too long.'); end if;
  if length(v_city) < 2 or length(v_city) > 80 then perform public.shop_err('Please enter your city.'); end if;
  if v_state not in ('AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','PR','GU','VI','AS','MP','AA','AE','AP')
    then perform public.shop_err('Please choose your state.'); end if;
  if v_zip !~ '^\d{5}(-\d{4})?$' then perform public.shop_err('Please enter a valid ZIP code.'); end if;
  if v_note is not null and length(v_note) > 1000 then perform public.shop_err('Your note is too long.'); end if;

  -- gentle limits against abuse
  if (select count(*) from public.shop_orders where email = v_email and created_at > now() - interval '1 hour') >= 5 then
    perform public.shop_err('You''ve placed several orders in the last hour. Please contact us if you need help.');
  end if;
  if (select count(*) from public.shop_orders where created_at > now() - interval '1 minute') >= 30 then
    perform public.shop_err('We''re getting a lot of orders right now. Please try again in a minute.');
  end if;

  -- the bag: every price comes from the database
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then perform public.shop_err('Your bag is empty.'); end if;
  if jsonb_array_length(p_items) > 20 then perform public.shop_err('That''s a lot of pieces! Please contact us for large orders.'); end if;
  for it in select * from jsonb_array_elements(p_items) loop
    begin
      select * into p from public.shop_products where id = (it ->> 'product_id')::uuid and active;
    exception when invalid_text_representation then p := null;
    end;
    if p.id is null then perform public.shop_err('An item in your bag is no longer available. Please remove it and try again.'); end if;
    if p.sold_out then perform public.shop_err(format('%s is sold out. Please remove it from your bag.', p.name)); end if;
    v_qty := coalesce((it ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 10 then perform public.shop_err('Quantities must be between 1 and 10.'); end if;
    v_size := btrim(coalesce(it ->> 'size', ''));
    v_color := btrim(coalesce(it ->> 'color', ''));
    if not (v_size = any (p.sizes)) then perform public.shop_err(format('Please choose a size for %s.', p.name)); end if;
    if not exists (select 1 from public.shop_product_colors c where c.product_id = p.id and c.name = v_color) then
      perform public.shop_err(format('Please choose a colour for %s.', p.name));
    end if;
    select * into v_variant from public.shop_product_variants v where v.product_id = p.id and v.size = v_size and v.color = v_color;
    if v_variant.id is not null and v_variant.sold_out then
      perform public.shop_err(format('%s in %s / %s is sold out.', p.name, v_color, v_size));
    end if;
    v_price := coalesce(v_variant.price_cents, p.price_cents);
    select i.url into v_image from public.shop_product_images i where i.product_id = p.id order by (i.color is not distinct from v_color) desc, i.sort limit 1;
    v_subtotal := v_subtotal + v_price * v_qty;
    v_lines := v_lines || jsonb_build_object('product_id', p.id, 'name', p.name, 'slug', p.slug, 'image', v_image, 'size', v_size,
      'color', v_color, 'quantity', v_qty, 'price', v_price);
    v_variant := null;
  end loop;

  select * into st from public.shop_settings where id = 1;
  v_shipping := case when st.free_shipping_over_cents is not null and v_subtotal >= st.free_shipping_over_cents then 0 else st.shipping_flat_cents end;

  -- a short, readable order number
  loop
    v_number := 'MK-';
    for k in 1..6 loop v_number := v_number || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.shop_orders where number = v_number);
  end loop;

  insert into public.shop_customers (email, name, phone) values (v_email, v_name, v_phone)
  on conflict (email) do update set name = excluded.name, phone = coalesce(excluded.phone, public.shop_customers.phone), updated_at = now()
  returning id into v_customer;

  insert into public.shop_orders (number, customer_id, email, name, phone, subtotal_cents, shipping_cents, total_cents, customer_note)
  values (v_number, v_customer, v_email, v_name, v_phone, v_subtotal, v_shipping, v_subtotal + v_shipping, v_note)
  returning id, lookup_token into v_order, v_token;

  insert into public.shop_shipments (order_id, name, line1, line2, city, state, zip) values (v_order, v_name, v_line1, v_line2, v_city, v_state, v_zip);

  insert into public.shop_order_items (order_id, product_id, product_name, product_slug, image, size, color, quantity, unit_price_cents, line_total_cents)
  select v_order, (l ->> 'product_id')::uuid, l ->> 'name', l ->> 'slug', l ->> 'image', l ->> 'size', l ->> 'color',
         (l ->> 'quantity')::int, (l ->> 'price')::int, (l ->> 'price')::int * (l ->> 'quantity')::int
  from jsonb_array_elements(v_lines) l;

  insert into public.shop_payments (order_id, method, amount_cents) values (v_order, 'venmo', v_subtotal + v_shipping);
  insert into public.shop_order_events (order_id, status, note) values (v_order, 'awaiting_payment', 'Order placed — awaiting Venmo payment.');

  if p_cart is not null then delete from public.shop_carts where token = p_cart; end if;

  return public.shop_order_json(v_order);
end $$;

-- The confirmation page (the token is kept on the customer's device after checkout).
create or replace function public.shop_get_order(p_number text, p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  select id into v from public.shop_orders where number = upper(btrim(p_number)) and lookup_token = p_token;
  return case when v is null then null else public.shop_order_json(v) end;
end $$;

-- "Track my order": order number + the email used at checkout.
create or replace function public.shop_lookup_order(p_number text, p_email text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  select id into v from public.shop_orders where number = upper(btrim(p_number)) and email = lower(btrim(p_email));
  return case when v is null then null else public.shop_order_json(v) end;
end $$;

-- A copy of the shopper's bag (kept in the browser) so open carts are visible to the shop.
create or replace function public.shop_save_cart(p_token uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null then return; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    delete from public.shop_carts where token = p_token;
    return;
  end if;
  insert into public.shop_carts (token) values (p_token) on conflict (token) do update set updated_at = now();
  delete from public.shop_cart_items where cart_token = p_token;
  insert into public.shop_cart_items (cart_token, product_id, size, color, quantity)
  select p_token, pr.id, left(a.x ->> 'size', 10), left(a.x ->> 'color', 40), least(greatest(coalesce((a.x ->> 'quantity')::int, 1), 1), 10)
  from (select value as x from jsonb_array_elements(p_items) limit 30) a
  join public.shop_products pr on pr.id::text = a.x ->> 'product_id';
end $$;

-- ---------------------------------------------------------------- forms

create or replace function public.shop_submit_custom_request(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p ->> 'email', '')));
  v_paths text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'image_paths', '[]'::jsonb)) x), '{}');
  v_id uuid;
begin
  if length(btrim(coalesce(p ->> 'name', ''))) < 2 then perform public.shop_err('Please enter your name.'); end if;
  if not public.shop_valid_email(v_email) then perform public.shop_err('Please enter a valid email address.'); end if;
  if length(btrim(coalesce(p ->> 'style', ''))) < 2 then perform public.shop_err('Please choose a cardigan style.'); end if;
  if length(btrim(coalesce(p ->> 'description', ''))) < 10 then perform public.shop_err('Please tell us a little more about your idea.'); end if;
  if length(p ->> 'description') > 3000 then perform public.shop_err('Your description is too long.'); end if;
  if array_length(v_paths, 1) > 4 or exists (select 1 from unnest(v_paths) x where x !~ '^requests/[A-Za-z0-9._/-]{1,200}$') then
    perform public.shop_err('Please upload up to 4 images.');
  end if;
  if (select count(*) from public.shop_custom_requests where email = v_email and created_at > now() - interval '1 day') >= 5 then
    perform public.shop_err('We''ve received several requests from you today — we''ll be in touch soon!');
  end if;
  insert into public.shop_custom_requests (name, email, style, color, size, fit, couple, description, image_paths)
  values (left(btrim(p ->> 'name'), 100), v_email, left(btrim(p ->> 'style'), 80), left(btrim(coalesce(p ->> 'color', '')), 80),
          left(btrim(coalesce(p ->> 'size', '')), 60), left(btrim(coalesce(p ->> 'fit', '')), 40), coalesce((p ->> 'couple')::boolean, false),
          btrim(p ->> 'description'), v_paths)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.shop_submit_message(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p ->> 'email', '')));
  v_id uuid;
begin
  if length(btrim(coalesce(p ->> 'name', ''))) < 2 then perform public.shop_err('Please enter your name.'); end if;
  if not public.shop_valid_email(v_email) then perform public.shop_err('Please enter a valid email address.'); end if;
  if length(btrim(coalesce(p ->> 'message', ''))) < 5 then perform public.shop_err('Please write a message.'); end if;
  if length(p ->> 'message') > 4000 then perform public.shop_err('Your message is too long.'); end if;
  if (select count(*) from public.shop_messages where email = v_email and created_at > now() - interval '1 hour') >= 5 then
    perform public.shop_err('Thanks — we''ve got your messages and will reply soon.');
  end if;
  insert into public.shop_messages (name, email, subject, message)
  values (left(btrim(p ->> 'name'), 100), v_email, left(btrim(coalesce(p ->> 'subject', '')), 120), btrim(p ->> 'message'))
  returning id into v_id;
  return v_id;
end $$;

-- Reviews from customers wait for approval before they appear.
create or replace function public.shop_submit_review(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_product uuid;
  v_id uuid;
begin
  begin
    v_product := (p ->> 'product_id')::uuid;
  exception when invalid_text_representation then v_product := null;
  end;
  if v_product is null or not exists (select 1 from public.shop_products where id = v_product and active) then perform public.shop_err('Product not found.'); end if;
  if length(btrim(coalesce(p ->> 'name', ''))) < 2 then perform public.shop_err('Please enter your name.'); end if;
  if coalesce((p ->> 'rating')::int, 0) not between 1 and 5 then perform public.shop_err('Please choose a star rating.'); end if;
  if length(btrim(coalesce(p ->> 'body', ''))) < 10 then perform public.shop_err('Please write a few words about your cardigan.'); end if;
  if length(p ->> 'body') > 2000 then perform public.shop_err('Your review is too long.'); end if;
  if (select count(*) from public.shop_reviews where created_at > now() - interval '1 hour' and not approved) >= 30 then
    perform public.shop_err('Please try again a little later.');
  end if;
  insert into public.shop_reviews (product_id, name, rating, title, body, approved)
  values (v_product, left(btrim(p ->> 'name'), 60), (p ->> 'rating')::int, left(btrim(coalesce(p ->> 'title', '')), 120), btrim(p ->> 'body'), false)
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------- admin

-- The owner claims the dashboard once with a private setup code.
create or replace function public.shop_claim_admin(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if auth.uid() is null then perform public.shop_err('Please sign in first.'); end if;
  if public.shop_is_admin() then return true; end if;
  select value into v_code from public.shop_secrets where key = 'owner_setup_code';
  if v_code is null or v_code <> btrim(coalesce(p_code, '')) then perform public.shop_err('That setup code isn''t right.'); end if;
  insert into public.shop_admins (user_id) values (auth.uid()) on conflict do nothing;
  delete from public.shop_secrets where key = 'owner_setup_code';
  return true;
end $$;

create or replace function public.shop_require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.shop_is_admin() then raise exception 'Not allowed.' using errcode = '42501'; end if;
end $$;

-- Record a verified Venmo payment. This is the only way an order becomes "paid".
create or replace function public.shop_admin_verify_payment(p_order uuid, p_amount_cents int, p_reference text, p_payer text, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.shop_orders;
begin
  perform public.shop_require_admin();
  select * into o from public.shop_orders where id = p_order for update;
  if o.id is null then perform public.shop_err('Order not found.'); end if;
  if o.status = 'cancelled' then perform public.shop_err('This order is cancelled.'); end if;
  if o.payment_status = 'verified' then perform public.shop_err('This payment is already verified.'); end if;
  if coalesce(p_amount_cents, 0) <= 0 then perform public.shop_err('Enter the amount you received in Venmo.'); end if;
  update public.shop_payments set status = 'verified', amount_cents = p_amount_cents, reference = nullif(btrim(coalesce(p_reference, '')), ''),
    payer = nullif(btrim(coalesce(p_payer, '')), ''), note = nullif(btrim(coalesce(p_note, '')), ''), verified_by = auth.uid(), verified_at = now()
  where order_id = o.id and status = 'pending';
  if not found then
    insert into public.shop_payments (order_id, amount_cents, status, reference, payer, note, verified_by, verified_at)
    values (o.id, p_amount_cents, 'verified', nullif(btrim(coalesce(p_reference, '')), ''), nullif(btrim(coalesce(p_payer, '')), ''), nullif(btrim(coalesce(p_note, '')), ''), auth.uid(), now());
  end if;
  update public.shop_orders set payment_status = 'verified', paid_at = now(),
    status = case when status = 'awaiting_payment' then 'payment_confirmed' else status end
  where id = o.id;
  insert into public.shop_order_events (order_id, status, note, by_admin)
  values (o.id, 'payment_confirmed', 'Venmo payment verified.', true);
  return public.shop_order_json(o.id);
end $$;

-- Undo a verification made by mistake (the order goes back to awaiting payment).
create or replace function public.shop_admin_reset_payment(p_order uuid, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.shop_orders;
begin
  perform public.shop_require_admin();
  select * into o from public.shop_orders where id = p_order for update;
  if o.id is null then perform public.shop_err('Order not found.'); end if;
  if o.status in ('shipped', 'delivered') then perform public.shop_err('This order has already shipped.'); end if;
  update public.shop_payments set status = 'rejected', note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), note) where order_id = o.id and status = 'verified';
  insert into public.shop_payments (order_id, amount_cents) values (o.id, o.total_cents);
  update public.shop_orders set payment_status = 'awaiting', paid_at = null,
    status = case when status = 'cancelled' then status else 'awaiting_payment' end where id = o.id;
  insert into public.shop_order_events (order_id, status, note, by_admin) values (o.id, 'awaiting_payment', coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Payment marked as not received.'), true);
  return public.shop_order_json(o.id);
end $$;

create or replace function public.shop_admin_set_status(p_order uuid, p_status text, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.shop_orders;
begin
  perform public.shop_require_admin();
  select * into o from public.shop_orders where id = p_order for update;
  if o.id is null then perform public.shop_err('Order not found.'); end if;
  if p_status not in ('preparing', 'production', 'shipped', 'delivered', 'cancelled') then
    perform public.shop_err('Use "Verify payment" to confirm a payment.');
  end if;
  if o.status = 'cancelled' then perform public.shop_err('This order is cancelled.'); end if;
  if p_status <> 'cancelled' and o.payment_status <> 'verified' then
    perform public.shop_err('Verify the Venmo payment before moving this order forward.');
  end if;
  update public.shop_orders set status = p_status, cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end where id = o.id;
  if p_status = 'shipped' then update public.shop_shipments set shipped_at = coalesce(shipped_at, now()) where order_id = o.id; end if;
  if p_status = 'delivered' then update public.shop_shipments set delivered_at = coalesce(delivered_at, now()), shipped_at = coalesce(shipped_at, now()) where order_id = o.id; end if;
  if p_status = 'cancelled' then update public.shop_payments set status = 'rejected' where order_id = o.id and status = 'pending'; end if;
  insert into public.shop_order_events (order_id, status, note, by_admin) values (o.id, p_status, nullif(btrim(coalesce(p_note, '')), ''), true);
  return public.shop_order_json(o.id);
end $$;

create or replace function public.shop_admin_set_tracking(p_order uuid, p_carrier text, p_number text, p_url text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.shop_require_admin();
  update public.shop_shipments set carrier = nullif(btrim(coalesce(p_carrier, '')), ''), tracking_number = nullif(btrim(coalesce(p_number, '')), ''),
    tracking_url = nullif(btrim(coalesce(p_url, '')), '') where order_id = p_order;
  if not found then perform public.shop_err('Order not found.'); end if;
  insert into public.shop_order_events (order_id, status, note, by_admin)
  select p_order, o.status, 'Tracking added: ' || coalesce(nullif(btrim(p_carrier), '') || ' ', '') || coalesce(btrim(p_number), ''), true
  from public.shop_orders o where o.id = p_order and nullif(btrim(coalesce(p_number, '')), '') is not null;
  return public.shop_order_json(p_order);
end $$;

-- Admin order view (adds payments and internal notes).
create or replace function public.shop_admin_order(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.shop_require_admin();
  return public.shop_order_json(p_order) || jsonb_build_object(
    'admin_notes', (select admin_notes from public.shop_orders where id = p_order),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.shop_payments p where p.order_id = p_order), '[]'::jsonb));
end $$;

-- Create or update a product with its categories, colours, photos and size × colour variants in one go.
create or replace function public.shop_admin_save_product(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_sizes text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'sizes') x), array['XS','S','M','L','XL','XXL']);
  v_details text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'details') x), '{}');
  c jsonb;
  i int := 0;
begin
  perform public.shop_require_admin();
  if length(btrim(coalesce(p ->> 'name', ''))) < 2 then perform public.shop_err('Give the product a name.'); end if;
  if coalesce((p ->> 'price_cents')::int, 0) <= 0 then perform public.shop_err('Set a price.'); end if;
  if coalesce(p ->> 'slug', '') !~ '^[a-z0-9-]+$' then perform public.shop_err('The web address may use lowercase letters, numbers and dashes.'); end if;
  if array_length(v_sizes, 1) is null then perform public.shop_err('Choose at least one size.'); end if;
  if jsonb_array_length(coalesce(p -> 'colors', '[]'::jsonb)) = 0 then perform public.shop_err('Add at least one colour.'); end if;
  if exists (select 1 from public.shop_products where slug = p ->> 'slug' and id is distinct from v_id) then
    perform public.shop_err('Another product already uses that web address.');
  end if;

  if v_id is null then
    insert into public.shop_products (slug, name, subtitle, description, price_cents, compare_at_cents, audience, badge, sizes, materials, care, details,
      processing_time, featured, sold_out, active, sort)
    values (p ->> 'slug', btrim(p ->> 'name'), coalesce(p ->> 'subtitle', ''), coalesce(p ->> 'description', ''), (p ->> 'price_cents')::int,
      nullif(p ->> 'compare_at_cents', '')::int, coalesce(p ->> 'audience', 'unisex'), nullif(p ->> 'badge', ''), v_sizes,
      coalesce(p ->> 'materials', ''), coalesce(p ->> 'care', ''), v_details, nullif(p ->> 'processing_time', ''),
      coalesce((p ->> 'featured')::boolean, false), coalesce((p ->> 'sold_out')::boolean, false), coalesce((p ->> 'active')::boolean, true),
      coalesce((p ->> 'sort')::int, 0))
    returning id into v_id;
  else
    update public.shop_products set slug = p ->> 'slug', name = btrim(p ->> 'name'), subtitle = coalesce(p ->> 'subtitle', ''),
      description = coalesce(p ->> 'description', ''), price_cents = (p ->> 'price_cents')::int, compare_at_cents = nullif(p ->> 'compare_at_cents', '')::int,
      audience = coalesce(p ->> 'audience', 'unisex'), badge = nullif(p ->> 'badge', ''), sizes = v_sizes, materials = coalesce(p ->> 'materials', ''),
      care = coalesce(p ->> 'care', ''), details = v_details, processing_time = nullif(p ->> 'processing_time', ''),
      featured = coalesce((p ->> 'featured')::boolean, false), sold_out = coalesce((p ->> 'sold_out')::boolean, false),
      active = coalesce((p ->> 'active')::boolean, true), sort = coalesce((p ->> 'sort')::int, 0)
    where id = v_id;
    if not found then perform public.shop_err('Product not found.'); end if;
  end if;

  delete from public.shop_product_categories where product_id = v_id;
  insert into public.shop_product_categories (product_id, category_slug)
  select v_id, x from jsonb_array_elements_text(coalesce(p -> 'categories', '[]'::jsonb)) x
  where exists (select 1 from public.shop_categories c2 where c2.slug = x) on conflict do nothing;

  delete from public.shop_product_colors where product_id = v_id;
  for c in select * from jsonb_array_elements(p -> 'colors') loop
    insert into public.shop_product_colors (product_id, name, hex, sort) values (v_id, btrim(c ->> 'name'), coalesce(c ->> 'hex', '#e8dccb'), i)
    on conflict (product_id, name) do nothing;
    i := i + 1;
  end loop;

  delete from public.shop_product_images where product_id = v_id;
  i := 0;
  for c in select * from jsonb_array_elements(coalesce(p -> 'images', '[]'::jsonb)) loop
    insert into public.shop_product_images (product_id, url, alt, color, sort) values (v_id, c ->> 'url', coalesce(c ->> 'alt', ''), nullif(c ->> 'color', ''), i);
    i := i + 1;
  end loop;

  -- variants: every size × colour; keep the sold-out combinations the admin ticked
  delete from public.shop_product_variants where product_id = v_id;
  insert into public.shop_product_variants (product_id, size, color, sold_out)
  select v_id, s, col.name, exists (select 1 from jsonb_array_elements(coalesce(p -> 'sold_out_variants', '[]'::jsonb)) so
                                    where so ->> 'size' = s and so ->> 'color' = col.name)
  from unnest(v_sizes) s cross join public.shop_product_colors col where col.product_id = v_id;

  return v_id;
end $$;

create or replace function public.shop_admin_delete_product(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.shop_require_admin();
  delete from public.shop_products where id = p_id;
end $$;

-- ---------------------------------------------------------------- photo storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-products', 'shop-products', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
       ('shop-requests', 'shop-requests', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'])
on conflict (id) do nothing;

create policy "shop admins upload product photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-products' and public.shop_is_admin());
create policy "shop admins change product photos" on storage.objects for update to authenticated
  using (bucket_id = 'shop-products' and public.shop_is_admin());
create policy "shop admins delete product photos" on storage.objects for delete to authenticated
  using (bucket_id = 'shop-products' and public.shop_is_admin());
-- custom-order reference images: anyone can upload into requests/, only admins can view them
create policy "shoppers upload custom-order images" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'shop-requests' and (storage.foldername(name))[1] = 'requests');
create policy "shop admins view custom-order images" on storage.objects for select to authenticated
  using (bucket_id = 'shop-requests' and public.shop_is_admin());

-- helpers are internal
revoke execute on function public.shop_require_admin() from public, anon;
