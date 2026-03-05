-- Fase 19 - Calculadora do Nutricionista e Envio de Metas

-- 1) Expandir perfil para armazenar metas de macros (caso ainda não existam)
ALTER TABLE public.usuarios_perfil
ADD COLUMN IF NOT EXISTS meta_carbo_g INTEGER,
ADD COLUMN IF NOT EXISTS meta_prot_g INTEGER,
ADD COLUMN IF NOT EXISTS meta_gord_g INTEGER;

-- 2) Garantir leitura de perfis de pacientes vinculados para o nutricionista
DROP POLICY IF EXISTS "Nutri pode ver perfis de pacientes vinculados" ON public.usuarios_perfil;
CREATE POLICY "Nutri pode ver perfis de pacientes vinculados" ON public.usuarios_perfil
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.nutri_clientes nc
        WHERE nc.cliente_id = usuarios_perfil.id
          AND nc.nutri_id = auth.uid()
    )
);

-- Opcional (necessário para edição direta do perfil do paciente pela visão do nutri)
DROP POLICY IF EXISTS "Nutri pode atualizar perfis de pacientes vinculados" ON public.usuarios_perfil;
CREATE POLICY "Nutri pode atualizar perfis de pacientes vinculados" ON public.usuarios_perfil
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.nutri_clientes nc
        WHERE nc.cliente_id = usuarios_perfil.id
          AND nc.nutri_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.nutri_clientes nc
        WHERE nc.cliente_id = usuarios_perfil.id
          AND nc.nutri_id = auth.uid()
    )
);

-- 3) Tabela de metas sugeridas
CREATE TABLE IF NOT EXISTS public.metas_sugeridas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nutri_id uuid NOT NULL REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
    paciente_id uuid NOT NULL REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
    meta_kcal integer NOT NULL,
    carbo_g integer NOT NULL,
    prot_g integer NOT NULL,
    gord_g integer NOT NULL,
    status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'recusada')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.metas_sugeridas ENABLE ROW LEVEL SECURITY;

-- Nutricionista: pode inserir e ler suas próprias sugestões
DROP POLICY IF EXISTS "Nutri insere metas sugeridas" ON public.metas_sugeridas;
CREATE POLICY "Nutri insere metas sugeridas" ON public.metas_sugeridas
FOR INSERT
WITH CHECK (auth.uid() = nutri_id);

DROP POLICY IF EXISTS "Nutri le metas sugeridas" ON public.metas_sugeridas;
CREATE POLICY "Nutri le metas sugeridas" ON public.metas_sugeridas
FOR SELECT
USING (auth.uid() = nutri_id);

-- Paciente: pode ler e atualizar apenas sugestões recebidas
DROP POLICY IF EXISTS "Paciente le metas sugeridas" ON public.metas_sugeridas;
CREATE POLICY "Paciente le metas sugeridas" ON public.metas_sugeridas
FOR SELECT
USING (auth.uid() = paciente_id);

DROP POLICY IF EXISTS "Paciente atualiza metas sugeridas" ON public.metas_sugeridas;
CREATE POLICY "Paciente atualiza metas sugeridas" ON public.metas_sugeridas
FOR UPDATE
USING (auth.uid() = paciente_id)
WITH CHECK (auth.uid() = paciente_id);
