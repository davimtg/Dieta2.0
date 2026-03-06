import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const userId = "c18600cd-dbfd-4680-bc4f-c44bb1978d38"; // I will just login and fetch one user's meals to see the syntax

    // let's just test the query itself
    const { data, error } = await supabase
        .from('refeicoes_diarias')
        .select(`
            id,
            data,
            itens_consumidos (
                id,
                quantidade_g,
                is_sugestao,
                alimentos (id, nome),
                receitas (
                    id, 
                    nome,
                    receita_ingredientes (
                        quantidade_g,
                        alimentos (id, nome)
                    )
                )
            )
        `)
        .limit(10);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Items:", JSON.stringify(data[0], null, 2));
    }
}
test();
