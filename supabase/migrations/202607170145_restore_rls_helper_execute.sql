-- RLS policy expressions call these helper functions as the API roles.
-- They only return booleans based on auth.uid() and do not mutate data.
grant execute on function public.is_store_member(uuid) to anon, authenticated;
grant execute on function public.has_store_role(uuid, public.membership_role[]) to anon, authenticated;
grant execute on function public.can_access_order(uuid) to anon, authenticated;
