-- pgTAP Permissions & Access Control Test for BurgerC Platform
begin;
select plan(2);

select has_function('public', 'has_store_role', array['uuid', 'public.membership_role[]'], 'Function has_store_role exists');
select has_function('public', 'is_store_member', array['uuid'], 'Function is_store_member exists');

select * from finish();
rollback;
