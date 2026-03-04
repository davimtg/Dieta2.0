-- Migration Phase 1: Nutri Portal & Diet Suggestions

-- 1. Add 'role' to user profiles
ALTER TABLE public.usuarios_perfil 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'nutri'));

-- 2. Add 'is_sugestao' to consumed items
ALTER TABLE public.itens_consumidos 
ADD COLUMN IF NOT EXISTS is_sugestao BOOLEAN DEFAULT false;

-- 3. Relationship between Nutritionist and Clients
CREATE TABLE IF NOT EXISTS public.nutri_clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nutri_id UUID NOT NULL REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(nutri_id, cliente_id)
);

-- Enable RLS for nutri_clientes
ALTER TABLE public.nutri_clientes ENABLE ROW LEVEL SECURITY;

-- 4. Diet Templates (Weekly Plans created by Nutri)
CREATE TABLE IF NOT EXISTS public.dietas_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nutri_id UUID NOT NULL REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for dietas_templates
ALTER TABLE public.dietas_templates ENABLE ROW LEVEL SECURITY;

-- 5. Items within a Diet Template
CREATE TABLE IF NOT EXISTS public.dietas_template_itens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.dietas_templates(id) ON DELETE CASCADE,
    dia_semana TEXT NOT NULL CHECK (dia_semana IN ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')),
    refeicao TEXT NOT NULL CHECK (refeicao IN ('cafe', 'almoco', 'lanche', 'jantar')),
    alimento_id UUID REFERENCES public.alimentos(id) ON DELETE SET NULL,
    receita_id UUID REFERENCES public.receitas(id) ON DELETE SET NULL,
    quantidade_g NUMERIC(6,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (
        (alimento_id IS NOT NULL AND receita_id IS NULL) OR 
        (alimento_id IS NULL AND receita_id IS NOT NULL)
    )
);

-- Enable RLS for dietas_template_itens
ALTER TABLE public.dietas_template_itens ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Basic Drafts - to be refined in Phase 3)

-- nutri_clientes: 
-- Nutri can see/insert/delete their own relationships
-- Client can see their own relationship
CREATE POLICY "Nutri can manage their clients" ON public.nutri_clientes
    FOR ALL USING (auth.uid() = nutri_id);

CREATE POLICY "Client can see their nutritionist" ON public.nutri_clientes
    FOR SELECT USING (auth.uid() = cliente_id);

-- dietas_templates:
-- Nutri can manage their own templates
CREATE POLICY "Nutri can manage their templates" ON public.dietas_templates
    FOR ALL USING (auth.uid() = nutri_id);

-- dietas_template_itens:
-- Nutri can manage items of their templates
CREATE POLICY "Nutri can manage template items" ON public.dietas_template_itens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.dietas_templates t 
            WHERE t.id = dietas_template_itens.template_id 
            AND t.nutri_id = auth.uid()
        )
    );
