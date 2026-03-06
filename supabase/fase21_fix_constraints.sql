-- Liberação de restrições de tipos de refeição para suportar IA e planos flexíveis

-- 1. Identificar e remover a restrição de CHECK na tabela refeicoes_diarias
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'refeicoes_diarias' AND constraint_name = 'refeicoes_diarias_tipo_refeicao_check') THEN
        ALTER TABLE public.refeicoes_diarias DROP CONSTRAINT refeicoes_diarias_tipo_refeicao_check;
    END IF;
END $$;

-- 2. Identificar e remover a restrição de CHECK na tabela plano_alimentar_itens
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'plano_alimentar_itens' AND constraint_name = 'plano_alimentar_itens_tipo_refeicao_check') THEN
        ALTER TABLE public.plano_alimentar_itens DROP CONSTRAINT plano_alimentar_itens_tipo_refeicao_check;
    END IF;
END $$;

-- 3. Garantir que as colunas aceitem qualquer texto (já são text em muitos casos, mas reforçamos)
ALTER TABLE public.refeicoes_diarias ALTER COLUMN tipo_refeicao TYPE text;
ALTER TABLE public.plano_alimentar_itens ALTER COLUMN tipo_refeicao TYPE text;

-- 4. Adicionar um comentário para documentar a mudança
COMMENT ON COLUMN public.refeicoes_diarias.tipo_refeicao IS 'Identificador da refeição. Pode ser um dos padrões (cafe, almoco, lanche, jantar) ou um slug dinâmico vindo da IA.';
