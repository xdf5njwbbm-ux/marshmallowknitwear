-- Admin functions already refuse non-admins; also stop signed-out visitors from calling them at all.
revoke execute on function public.shop_admin_verify_payment(uuid, int, text, text, text) from public, anon;
revoke execute on function public.shop_admin_reset_payment(uuid, text) from public, anon;
revoke execute on function public.shop_admin_set_status(uuid, text, text) from public, anon;
revoke execute on function public.shop_admin_set_tracking(uuid, text, text, text) from public, anon;
revoke execute on function public.shop_admin_order(uuid) from public, anon;
revoke execute on function public.shop_admin_save_product(jsonb) from public, anon;
revoke execute on function public.shop_admin_delete_product(uuid) from public, anon;
revoke execute on function public.shop_claim_admin(text) from public, anon;
grant execute on function public.shop_admin_verify_payment(uuid, int, text, text, text) to authenticated;
grant execute on function public.shop_admin_reset_payment(uuid, text) to authenticated;
grant execute on function public.shop_admin_set_status(uuid, text, text) to authenticated;
grant execute on function public.shop_admin_set_tracking(uuid, text, text, text) to authenticated;
grant execute on function public.shop_admin_order(uuid) to authenticated;
grant execute on function public.shop_admin_save_product(jsonb) to authenticated;
grant execute on function public.shop_admin_delete_product(uuid) to authenticated;
grant execute on function public.shop_claim_admin(text) to authenticated;

alter function public.shop_err(text) set search_path = '';
alter function public.shop_valid_email(text) set search_path = '';
