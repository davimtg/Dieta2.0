-- Fase 20: Flexibilidade do Plano (Subtotais e Refeições Dinâmicas)
-- Adicionando coluna para armazenar nomes customizados de refeições

ALTER TABLE public.plano_alimentar_itens 
ADD COLUMN IF NOT EXISTS nome_refeicao text;

ALTER TABLE public.refeicoes_diarias 
ADD COLUMN IF NOT EXISTS nome_refeicao text;
