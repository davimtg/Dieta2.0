-- Fase 16: Adicionando coluna de Substituições nos Itens do Plano e Consumidos

-- 1. Adicionar substituicoes na tabela plano_alimentar_itens
ALTER TABLE plano_alimentar_itens
ADD COLUMN IF NOT EXISTS substituicoes JSONB DEFAULT '[]'::jsonb;

-- 2. Adicionar substituicoes na tabela itens_consumidos (propagada ao aplicar o plano)
ALTER TABLE itens_consumidos
ADD COLUMN IF NOT EXISTS substituicoes JSONB DEFAULT '[]'::jsonb;

-- Comentário de utilização:
-- O campo substituicoes é um array JSON com objetos no seguinte formato:
-- [
--   { "alimento_id": "<uuid>", "quantidade_g": 100, "nome": "Tapioca" },
--   { "receita_id": "<uuid>", "quantidade_g": 1, "nome": "Panqueca de Aveia" }
-- ]
-- O nutri define esses objetos ao montar o plano.
-- Ao "Aplicar à Minha Rotina", os substituicoes do plano são copiados para o respectivo item em itens_consumidos.
-- Na Dashboard, se o item for is_sugestao=true e tiver substituicoes != [], mostrar botão "Trocar".
