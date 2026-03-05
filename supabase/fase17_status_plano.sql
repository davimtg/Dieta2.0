-- Fase 17: Adicionar coluna de status ao Plano Alimentar

-- 1. Adicionar coluna status (rascunho | enviado)
ALTER TABLE planos_alimentares
ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';

-- 2. Atualizar planos existentes que já estavam com ativo=true para 'enviado'
-- (preserva comportamento anterior: quem já tinha plano ativo continua vendo)
UPDATE planos_alimentares
SET status = 'enviado'
WHERE ativo = true AND status = 'rascunho';

-- Comentário: 
-- 'rascunho' = plano em construção, visível apenas para o nutricionista
-- 'enviado'  = plano publicado, visível no app do paciente
