import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const { data, error } = await supabase
        .from('receitas')
        .select(`
          *,
          receita_ingredientes (
            id,
            alimento_id,
            ingrediente_receita_id,
            quantidade_g,
            alimentos (*),
            receitas:receitas!ingrediente_receita_id (*, receita_ingredientes (*, alimentos (*)))
          )
        `)
        .limit(1);

    if (error) {
        console.error("FORMAT 1 ERROR:", error.message, error.details, error.hint);
    } else {
        console.log("FORMAT 1 SUCCESS");
    }

    const { data: d2, error: e2 } = await supabase
        .from('refeicoes_diarias')
        .select('*, itens_consumidos(*, alimentos(*), receitas(*, receita_ingredientes(*, alimentos(*), receitas:receitas!ingrediente_receita_id(*, receita_ingredientes(*, alimentos(*))))))')
        .limit(1);

    if (e2) {
        console.error("FORMAT 2 ERROR:", e2.message, e2.details, e2.hint);
    } else {
        console.log("FORMAT 2 SUCCESS");
    }
}

testQuery();
