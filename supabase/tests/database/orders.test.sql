-- pgTAP Order Management RPC & Workflow Test for BurgerC Platform
begin;
select plan(3);

select has_function('public', 'place_order', array['uuid', 'public.fulfillment_type', 'text', 'text', 'jsonb', 'public.payment_method', 'jsonb', 'text'], 'Function place_order exists');
select has_function('public', 'get_order_status_timeline', array['uuid'], 'Function get_order_status_timeline exists');
select has_function('public', 'transition_order_status', array['uuid', 'public.order_status', 'text'], 'Function transition_order_status exists');

select * from finish();
rollback;
