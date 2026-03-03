-- Nutriplanner V2 - Supabase Migration Schema

-- 1. Tabela de Perfil de Usuários
-- Dependente do schema `auth.users` do próprio Supabase
CREATE TABLE public.usuarios_perfil (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    meta_kcal INTEGER NOT NULL DEFAULT 2000,
    meta_agua_ml INTEGER NOT NULL DEFAULT 2500,
    peso_atual NUMERIC(5,2),
    objetivo TEXT CHECK (objetivo IN ('perder', 'manter', 'ganhar')) DEFAULT 'manter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Alimentos
CREATE TABLE public.alimentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    marca TEXT,
    porcao_base_g NUMERIC(6,2) NOT NULL DEFAULT 100,
    kcal NUMERIC(6,2) NOT NULL DEFAULT 0,
    carbo NUMERIC(6,2) NOT NULL DEFAULT 0,
    prot NUMERIC(6,2) NOT NULL DEFAULT 0,
    gord NUMERIC(6,2) NOT NULL DEFAULT 0,
    fibra NUMERIC(6,2) DEFAULT 0,
    sodio NUMERIC(6,2) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Se NULL = alimento global
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Receitas
CREATE TABLE public.receitas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    imagem_url TEXT,
    tempo_preparo_min INTEGER,
    rendimento_porcoes INTEGER NOT NULL DEFAULT 1,
    modo_preparo TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Ingredientes das Receitas (Relacionamento NxN entre Receitas e Alimentos)
CREATE TABLE public.receita_ingredientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receita_id UUID REFERENCES public.receitas(id) ON DELETE CASCADE NOT NULL,
    alimento_id UUID REFERENCES public.alimentos(id) ON DELETE CASCADE NOT NULL,
    quantidade_g NUMERIC(6,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Refeições Diárias
CREATE TABLE public.refeicoes_diarias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    tipo_refeicao TEXT CHECK (tipo_refeicao IN ('cafe', 'almoco', 'lanche', 'jantar')) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(data, tipo_refeicao, user_id) -- Garante que não teremos dois "cafés da manhã" no mesmo dia pro mesmo usuário
);

-- 6. Tabela de Itens Consumidos (Pode ser um Alimento Base ou uma Receita)
CREATE TABLE public.itens_consumidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    refeicao_id UUID REFERENCES public.refeicoes_diarias(id) ON DELETE CASCADE NOT NULL,
    alimento_id UUID REFERENCES public.alimentos(id) ON DELETE CASCADE, -- opcional
    receita_id UUID REFERENCES public.receitas(id) ON DELETE CASCADE,   -- opcional
    quantidade_g NUMERIC(6,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (
        (alimento_id IS NOT NULL AND receita_id IS NULL) OR 
        (alimento_id IS NULL AND receita_id IS NOT NULL)
    ) -- Restrição de Integridade: Tem que ser um ou o outro
);

-- 7. Tabela de Histórico de Peso
CREATE TABLE public.historico_peso (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    peso_kg NUMERIC(5,2) NOT NULL,
    imagem_progresso_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitando RLS (Row Level Security) para todas as tabelas

ALTER TABLE public.usuarios_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refeicoes_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_consumidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_peso ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS Básicas (Restringindo o acesso para que cada usuário veja apenas seus dados)

-- Perfil: O usuário só pode ver/editar o próprio perfil
CREATE POLICY "Usuários podem ver o próprio perfil" ON public.usuarios_perfil FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON public.usuarios_perfil FOR UPDATE USING (auth.uid() = id);

-- Alimentos: O usuário pode ver os próprios alimentos OU os globais/verificados (user_id IS NULL)
CREATE POLICY "Alimentos visíveis" ON public.alimentos FOR SELECT USING (auth.uid() = user_id OR is_verified = true OR user_id IS NULL);
CREATE POLICY "Usuários inserem próprios alimentos" ON public.alimentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam próprios alimentos" ON public.alimentos FOR UPDATE USING (auth.uid() = user_id);

-- Para todo o restante, a regra é simples: Apenas o dono pode ver/inserir/deletar/atualizar
CREATE POLICY "Dono tem controle total (Receitas)" ON public.receitas FOR ALL USING (auth.uid() = user_id);

-- Refeições: Verifica pelo `user_id`
CREATE POLICY "Dono tem controle total (Refeições)" ON public.refeicoes_diarias FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Dono tem controle total (Histórico Peso)" ON public.historico_peso FOR ALL USING (auth.uid() = user_id);

-- Políticas em cascata através de Join (O usuário acessa os itens da refeição dele)
CREATE POLICY "Acesso aos Itens Consumidos" ON public.itens_consumidos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.refeicoes_diarias
    WHERE public.refeicoes_diarias.id = public.itens_consumidos.refeicao_id
    AND public.refeicoes_diarias.user_id = auth.uid()
  )
);

CREATE POLICY "Acesso aos Ingredientes de Receitas" ON public.receita_ingredientes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.receitas
    WHERE public.receitas.id = public.receita_ingredientes.receita_id
    AND public.receitas.user_id = auth.uid()
  )
);
