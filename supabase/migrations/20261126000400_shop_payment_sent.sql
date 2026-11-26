-- The customer can tell us they've sent their Venmo payment (and from which account).
-- This does NOT mark the order paid — it only helps the shop find the payment to verify it.
create or replace function public.shop_mark_sent(p_number text, p_token uuid, p_payer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.shop_orders;
begin
  select * into o from public.shop_orders where number = upper(btrim(p_number)) and lookup_token = p_token;
  if o.id is null then perform public.shop_err('Order not found.'); end if;
  if o.payment_status <> 'awaiting' or o.status = 'cancelled' then return public.shop_order_json(o.id); end if;
  update public.shop_payments set payer = coalesce(nullif(left(btrim(coalesce(p_payer, '')), 60), ''), payer),
    note = 'Customer says payment was sent ' || to_char(now() at time zone 'America/New_York', 'Mon DD, HH12:MI AM') || ' ET'
  where order_id = o.id and status = 'pending';
  if not exists (select 1 from public.shop_order_events where order_id = o.id and note like 'Customer reported%') then
    insert into public.shop_order_events (order_id, status, note) values (o.id, 'awaiting_payment', 'Customer reported sending the Venmo payment — waiting for the shop to confirm it.');
  end if;
  return public.shop_order_json(o.id);
end $$;
