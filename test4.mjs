const url = 'https://rmnceswyiscbnfzymjci.supabase.co/rest/v1/receitas?select=' + encodeURIComponent('*, receita_ingredientes(*, receitas!ingrediente_receita_id(*))');

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
