import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
    }
    return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Checking how many users exist in usuarios_perfil...");
    const { data, error } = await supabase
        .from('usuarios_perfil')
        .select('*');

    if (error) {
        console.error("Error usuarios_perfil:", error);
    } else {
        console.log("Total users:", data?.length);
    }

    console.log("Checking nutri_clientes links...");
    const { data: data2, error: error2 } = await supabase
        .from('nutri_clientes')
        .select('*');

    if (error2) {
        console.error("Error nutri_clientes:", error2);
    } else {
        console.log("Total links:", data2?.length);
    }
}

test();
