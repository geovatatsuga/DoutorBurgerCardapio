-- pgTAP RLS Security Verification Test for BurgerC Platform
begin;
select plan(4);

select table_has_rls('public', 'stores', 'Table stores has RLS enabled');
select table_has_rls('public', 'products', 'Table products has RLS enabled');
select table_has_rls('public', 'orders', 'Table orders has RLS enabled');
select table_has_rls('public', 'store_memberships', 'Table store_memberships has RLS enabled');

select * from finish();
rollback;
