-- Fase 15: Gestao de Unidades e Rendimento Real
-- Script para adicionar suporte a ml e reestruturar o rendimento de receitas

-- 1. Tabela Alimentos: Adicionar unidade de medida
ALTER TABLE public.alimentos 
ADD COLUMN IF NOT EXISTS unidade_medida text DEFAULT 'g' CHECK (unidade_medida IN ('g', 'ml'));

-- 2. Tabela Receitas: Adicionar novas colunas de rendimento
ALTER TABLE public.receitas
ADD COLUMN IF NOT EXISTS tipo_rendimento text DEFAULT 'porcoes' CHECK (tipo_rendimento IN ('porcoes', 'peso_volume')),
ADD COLUMN IF NOT EXISTS rendimento_quantidade numeric,
ADD COLUMN IF NOT EXISTS rendimento_unidade text DEFAULT 'porcao' CHECK (rendimento_unidade IN ('porcao', 'g', 'ml'));

-- 3. Migrar dados existentes da coluna antiga para a nova
UPDATE public.receitas
SET 
    rendimento_quantidade = rendimento_porcoes,
    tipo_rendimento = 'porcoes',
    rendimento_unidade = 'porcao'
WHERE rendimento_porcoes IS NOT NULL AND rendimento_quantidade IS NULL;

-- 4. Definir default temporario e not null (opcional, mas recomendado dependendo da estrutura atual)
-- Primeiro garantimos que tudo tem valor
UPDATE public.receitas SET rendimento_quantidade = 1 WHERE rendimento_quantidade IS NULL;

-- 5. Opcional: Remover a coluna antiga (Cuidado se tiver views dependendo)
-- ALTER TABLE public.receitas DROP COLUMN IF EXISTS rendimento_porcoes;
