// Diagnóstico: listar modelos disponíveis com a chave Gemini configurada
// Execute: node tmp/check_gemini_models.mjs AIzaSy...suachave

const apiKey = process.argv[2];

if (!apiKey) {
    console.error('Uso: node tmp/check_gemini_models.mjs <SUA_GEMINI_API_KEY>');
    process.exit(1);
}

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
const json = await res.json();

if (json.error) {
    console.error('ERRO da API:', json.error.message);
    console.error('Código:', json.error.code);
    console.error('Status:', json.error.status);
    process.exit(1);
}

const modelsQueSuportamGenerate = json.models
    ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name);

console.log('\n✅ Modelos que suportam generateContent com sua chave:\n');
modelsQueSuportamGenerate?.forEach(m => console.log(' -', m));
