-- Public tracking is served by an Edge Function after order number, exact phone,
-- and an IP quota are checked. This table is never readable from the browser.
create table if not exists public.order_tracking_rate_limits (
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (client_hash, window_start)
);

create index if not exists order_tracking_rate_limits_window_idx
  on public.order_tracking_rate_limits (window_start);

alter table public.order_tracking_rate_limits enable row level security;
revoke all on public.order_tracking_rate_limits from public, anon, authenticated;
grant all on public.order_tracking_rate_limits to service_role;

create or replace function public.consume_order_tracking_quota(p_client_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid client identifier';
  end if;

  v_window_start := date_trunc('hour', now())
    + floor(extract(minute from now()) / 15) * interval '15 minutes';

  insert into public.order_tracking_rate_limits (client_hash, window_start, request_count)
  values (p_client_hash, v_window_start, 1)
  on conflict (client_hash, window_start) do update
    set request_count = public.order_tracking_rate_limits.request_count + 1
    where public.order_tracking_rate_limits.request_count < 40
  returning request_count into v_request_count;

  delete from public.order_tracking_rate_limits
  where window_start < date_trunc('day', now()) - interval '1 day';

  return v_request_count is not null;
end;
$$;

revoke all on function public.consume_order_tracking_quota(text) from public, anon, authenticated;
grant execute on function public.consume_order_tracking_quota(text) to service_role;
