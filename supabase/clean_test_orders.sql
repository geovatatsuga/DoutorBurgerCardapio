-- =========================================================
-- SCRIPT DE LIMPEZA E ZERAMENTO DE PEDIDOS DE TESTE (SUPABASE)
-- Doutor Burger - Limpeza Completa de Banco
-- =========================================================

-- 1. Excluir dependências dos pedidos (itens, modificadores, pagamentos, histórico e auditoria)
DELETE FROM public.order_item_modifiers;
DELETE FROM public.order_items;
DELETE FROM public.payments;
DELETE FROM public.order_status_history;
DELETE FROM public.analytics_events;

-- 2. Excluir todos os pedidos de teste da tabela principal
DELETE FROM public.orders;

-- 3. Resetar o contador de sequência do número de pedidos para recomeçar do 1
-- (Garante que o próximo pedido real será o Pedido #1)
ALTER SEQUENCE IF EXISTS public.orders_order_number_seq RESTART WITH 1;

-- 4. Confirmação visual de limpeza
SELECT count(*) AS total_pedidos_restantes FROM public.orders;
