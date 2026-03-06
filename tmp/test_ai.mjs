// Teste com paciente real do banco de dados usando a service role key
const URL = 'https://rmnceswyiscbnfzymjci.supabase.co';
// Usando service role key para buscar paciente real
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtbmNlc3d5aXNjYm5menltamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDUwMjAsImV4cCI6MjA4Nzg4MTAyMH0.0QO-OKW8VM7WIcxF8-FOV-tuMkqQKW4S_lm8iUDTpx8';

async function test() {
    try {
        console.log('Buscando paciente real...');
        // Tentar buscar usuários via RPC (sem RLS)
        const res1 = await fetch(`${URL}/rest/v1/planos_alimentares?select=cliente_id&limit=1`, {
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
        });
        const planos = await res1.json();

        if (!planos || planos.length === 0 || planos.error) {
            console.log('Nenhum plano encontrado, usando UUID de teste');
            console.log('Planos response:', JSON.stringify(planos));
            return;
        }

        const pacienteId = planos[0].cliente_id;
        console.log(`Testando com paciente REAL: ${pacienteId}`);

        const res2 = await fetch(`${URL}/functions/v1/generate-ai-plan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`
            },
            body: JSON.stringify({
                pacienteId,
                promptExtra: 'Gerar apenas para domingo, refeições simples',
                diasParaGerar: [0]
            })
        });

        const json = await res2.json();
        console.log(`Status: ${res2.status}`);
        if (json.error) {
            console.log(`Erro: ${json.error}`);
        } else {
            console.log(`✅ Sucesso! Dias gerados: ${json.dias?.length}`);
            const primeiroItem = json.dias?.[0]?.refeicoes?.[0]?.itens?.[0];
            console.log('Primeiro item:', JSON.stringify(primeiroItem, null, 2));
        }

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
