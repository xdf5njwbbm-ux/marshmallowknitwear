-- Admins may edit private notes on an order directly, but payment and order status can only
-- change through the audited functions (verify payment, set status, set tracking).
revoke update on public.shop_orders from anon, authenticated;
grant update (admin_notes) on public.shop_orders to authenticated;
