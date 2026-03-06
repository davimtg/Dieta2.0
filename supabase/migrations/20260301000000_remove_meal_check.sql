-- Migração para remover a restrição de CHECK nas refeições
ALTER TABLE public.refeicoes_diarias DROP CONSTRAINT IF EXISTS refeicoes_diarias_tipo_refeicao_check;
ALTER TABLE public.plano_alimentar_itens DROP CONSTRAINT IF EXISTS plano_alimentar_itens_tipo_refeicao_check;
