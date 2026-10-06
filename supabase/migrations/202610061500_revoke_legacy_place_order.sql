-- The storefront now submits orders through the place-order Edge Function.
-- Close the old eight-argument RPC, which bypasses the Edge Function quota.
revoke execute on function public.place_order(
  uuid,
  public.fulfillment_type,
  text,
  text,
  jsonb,
  public.payment_method,
  jsonb,
  text
) from public, anon, authenticated;
