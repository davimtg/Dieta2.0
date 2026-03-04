-- FIX TOTAL DE PERMISSÕES E PERFIL NUTRI

-- 1. Garante que a coluna 'role' existe
ALTER TABLE public.usuarios_perfil 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'nutri'));

-- 2. Correção Crítica de RLS (Permitir Inserção de Perfil)
DROP POLICY IF EXISTS "Usuários podem inserir o próprio perfil" ON public.usuarios_perfil;
CREATE POLICY "Usuários podem inserir o próprio perfil" ON public.usuarios_perfil FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Para garantir: Permitir update também
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.usuarios_perfil;
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON public.usuarios_perfil FOR UPDATE USING (auth.uid() = id);

-- 4. Inserir/Atualizar o usuário específico que estava com problema
-- Substitua o ID pelo ID do seu usuário se for diferente
INSERT INTO public.usuarios_perfil (id, role, meta_kcal, meta_agua_ml)
VALUES ('e07f7b0c-d9ba-4ec8-b0ee-89e2356f5b45', 'nutri', 2000, 2500)
ON CONFLICT (id) DO UPDATE
SET role = 'nutri';
