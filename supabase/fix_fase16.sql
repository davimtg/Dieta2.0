-- Rode este script no Supabase SQL Editor para corrigir o erro de loop infinito (PGRST201 e falha de Join)

-- 1. Corrigir nutri_clientes para referenciar usuarios_perfil em vez de auth.users
ALTER TABLE public.nutri_clientes
DROP CONSTRAINT IF EXISTS nutri_clientes_nutri_id_fkey,
DROP CONSTRAINT IF EXISTS nutri_clientes_cliente_id_fkey;

ALTER TABLE public.nutri_clientes
ADD CONSTRAINT fk_nutri FOREIGN KEY (nutri_id) REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE;

-- 2. Corrigir planos_alimentares para referenciar usuarios_perfil em vez de auth.users
ALTER TABLE public.planos_alimentares
DROP CONSTRAINT IF EXISTS planos_alimentares_nutri_id_fkey,
DROP CONSTRAINT IF EXISTS planos_alimentares_cliente_id_fkey;

ALTER TABLE public.planos_alimentares
ADD CONSTRAINT fk_plano_nutri FOREIGN KEY (nutri_id) REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_plano_cliente FOREIGN KEY (cliente_id) REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE;
