const url = 'https://rmnceswyiscbnfzymjci.supabase.co/rest/v1/refeicoes_diarias?select=' + encodeURIComponent('*, itens_consumidos(*, alimentos(*), receitas(*, receita_ingredientes(*, alimentos(*), receitas!receita_ingredientes_ingrediente_receita_id_fkey(*, receita_ingredientes(*, alimentos(*))))))');

async function test(url) {
    const res = await fetch(url, {
        headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtbmNlc3d5aXNjYm5menltamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDUwMjAsImV4cCI6MjA4Nzg4MTAyMH0.0QO-OKW8VM7WIcxF8-FOV-tuMkqQKW4S_lm8iUDTpx8',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtbmNlc3d5aXNjYm5menltamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDUwMjAsImV4cCI6MjA4Nzg4MTAyMH0.0QO-OKW8VM7WIcxF8-FOV-tuMkqQKW4S_lm8iUDTpx8'
        }
    });
    console.log(JSON.stringify(await res.json(), null, 2));
}
test(url);
