grant usage on schema public to anon, authenticated;

grant select on public.stores,
  public.store_hours,
  public.categories,
  public.products,
  public.modifier_groups,
  public.modifier_options,
  public.product_modifier_groups,
  public.delivery_zones
to anon, authenticated;

grant select on public.profiles,
  public.store_memberships,
  public.orders,
  public.order_items,
  public.order_item_modifiers,
  public.payments,
  public.order_status_history,
  public.analytics_events,
  public.audit_logs,
  public.integration_accounts,
  public.integration_events
to authenticated;

grant insert, update on public.categories,
  public.products,
  public.modifier_groups,
  public.modifier_options,
  public.product_modifier_groups,
  public.store_hours,
  public.delivery_zones
to authenticated;

grant update on public.stores to authenticated;

grant insert, update, delete on public.customer_addresses to authenticated;
grant insert on public.analytics_events to anon, authenticated;
grant update on public.profiles to authenticated;

grant execute on function public.place_order(uuid, public.fulfillment_type, text, text, jsonb, public.payment_method, jsonb, text) to anon, authenticated;
grant execute on function public.transition_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.add_store_member_by_email(uuid, text, public.membership_role) to authenticated;
grant execute on function public.set_store_member_active(uuid, boolean) to authenticated;
