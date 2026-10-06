-- Apply only after reviewing the manual-payment flow. This does not enable automatic Pix confirmation.
create or replace function public.confirm_manual_payment(p_order_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found';
  end if;
  if not public.has_store_role(v_order.store_id, array['owner','admin','manager','cashier']::public.membership_role[]) then
    raise exception 'not allowed';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'cancelled order cannot be marked paid';
  end if;

  select * into v_payment from public.payments where order_id = p_order_id for update;
  if not found then
    raise exception 'payment not found';
  end if;
  if v_payment.status = 'paid' then
    return v_payment;
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'payment cannot be confirmed from its current status';
  end if;
  if v_payment.amount_cents <> v_order.total_cents then
    raise exception 'payment amount does not match order total';
  end if;

  update public.payments set status = 'paid' where id = v_payment.id returning * into v_payment;

  insert into public.audit_logs (store_id, actor_id, action, entity_table, entity_id, before_data, after_data)
  values (
    v_order.store_id, auth.uid(), 'confirm_manual_payment', 'payments', v_payment.id,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'paid', 'amount_cents', v_payment.amount_cents)
  );

  return v_payment;
end;
$$;

revoke all on function public.confirm_manual_payment(uuid) from public, anon;
grant execute on function public.confirm_manual_payment(uuid) to authenticated;
