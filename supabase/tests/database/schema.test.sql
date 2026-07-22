-- pgTAP Database Schema Verification Test for BurgerC Platform
begin;
select plan(6);

select has_table('public', 'stores', 'Table public.stores exists');
select has_table('public', 'products', 'Table public.products exists');
select has_table('public', 'categories', 'Table public.categories exists');
select has_table('public', 'orders', 'Table public.orders exists');
select has_table('public', 'order_items', 'Table public.order_items exists');
select has_table('public', 'order_status_history', 'Table public.order_status_history exists');

select * from finish();
rollback;
