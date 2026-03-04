-- FIX COMPLETO: ADICIONAR COLUNA "ROLE" E ACERTAR PERMISSÕES

-- 1. Adicionar coluna 'role' que está FALTANDO na tabela
ALTER TABLE public.usuarios_perfil 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'nutri'));

-- 2. Corrigir a política RLS (para permitir novos cadastros)
DROP POLICY IF EXISTS "Usuários podem inserir o próprio perfil" ON public.usuarios_perfil;
CREATE POLICY "Usuários podem inserir o próprio perfil" ON public.usuarios_perfil FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Atualizar/Inserir seu usuário como Nutricionista
INSERT INTO public.usuarios_perfil (id, role, meta_kcal, meta_agua_ml)
VALUES ('e07f7b0c-d9ba-4ec8-b0ee-89e2356f5b45', 'nutri', 2000, 2500)
ON CONFLICT (id) DO UPDATE
SET role = 'nutri';

-- 4. Verificar resultado (opcional)
SELECT * FROM public.usuarios_perfil WHERE id = 'e07f7b0c-d9ba-4ec8-b0ee-89e2356f5b45';