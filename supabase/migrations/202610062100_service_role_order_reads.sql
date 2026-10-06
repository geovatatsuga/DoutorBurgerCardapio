-- Edge Functions use a server-only key. RLS bypass alone does not grant table SELECT.
grant select on public.orders, public.payments to service_role;
