-- 1. Modificar Tabelas Existentes
ALTER TABLE usuarios_perfil ADD COLUMN IF NOT EXISTS role text DEFAULT 'cliente';
ALTER TABLE itens_consumidos ADD COLUMN IF NOT EXISTS is_sugestao boolean DEFAULT false;

-- 2. Tabela de Vínculo Nutricionista <-> Cliente
CREATE TABLE IF NOT EXISTS nutri_clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nutri_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(nutri_id, cliente_id)
);

-- Ativar RLS
ALTER TABLE nutri_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutri e clientes podem ver seus vínculos" ON nutri_clientes
    FOR SELECT USING (auth.uid() = nutri_id OR auth.uid() = cliente_id);

CREATE POLICY "Nutri pode gerenciar vínculos" ON nutri_clientes
    FOR ALL USING (auth.uid() = nutri_id);

-- 3. Planos Alimentares
CREATE TABLE IF NOT EXISTS planos_alimentares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nutri_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    nome text NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE planos_alimentares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envolvidos podem ver planos" ON planos_alimentares
    FOR SELECT USING (auth.uid() = nutri_id OR auth.uid() = cliente_id);

CREATE POLICY "Nutri gerencia planos" ON planos_alimentares
    FOR ALL USING (auth.uid() = nutri_id);

-- 4. Itens do Plano Alimentar
CREATE TABLE IF NOT EXISTS plano_alimentar_itens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plano_id uuid REFERENCES planos_alimentares(id) ON DELETE CASCADE,
    dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    tipo_refeicao text NOT NULL,
    alimento_id uuid REFERENCES alimentos(id) ON DELETE SET NULL,
    receita_id uuid REFERENCES receitas(id) ON DELETE SET NULL,
    quantidade_g numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE plano_alimentar_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envolvidos podem ver itens" ON plano_alimentar_itens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM planos_alimentares p
            WHERE p.id = plano_alimentar_itens.plano_id
            AND (p.nutri_id = auth.uid() OR p.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Nutri gerencia itens" ON plano_alimentar_itens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM planos_alimentares p
            WHERE p.id = plano_alimentar_itens.plano_id
            AND p.nutri_id = auth.uid()
        )
    );
