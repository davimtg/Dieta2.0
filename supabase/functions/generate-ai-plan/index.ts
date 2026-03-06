import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reutilização da lógica central de scraping
async function scrapeUrl(url: string) {
    const isVitat = url.includes('vitat.com.br');
    const isFatSecret = url.includes('fatsecret.com');

    if (!isVitat && !isFatSecret) return null;

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        let nome = '';
        let kcal = 0, carbo = 0, prot = 0, gord = 0, porcao_base_g = 100;

        if (isVitat) {
            nome = $('h1').first().text()?.trim() || $('title').text()?.split('-')[0]?.trim() || '';
            const nextDataScript = $('#__NEXT_DATA__').html();
            if (nextDataScript) {
                try {
                    const nextData = JSON.parse(nextDataScript);
                    const foodData = nextData?.props?.pageProps?.foodsData || nextData?.props?.pageProps?.foods || nextData?.props?.pageProps?.food;
                    if (foodData) {
                        nome = foodData.nome || nome;
                        kcal = parseFloat(foodData.caloria || foodData.calorias || 0);
                        carbo = parseFloat(foodData.carboidratos || 0);
                        prot = parseFloat(foodData.proteína || foodData.proteina || 0);
                        gord = parseFloat(foodData.gordurasTotais || 0);
                    }
                } catch (e) { }
            }
        } else if (isFatSecret) {
            nome = $('h1').first().text()?.trim() || $('title').text()?.split('|')[0]?.trim() || '';
            const factPanels = $('.factTitle').toArray();
            if (factPanels.length > 0) {
                factPanels.forEach(el => {
                    const title = $(el).text().trim().toLowerCase();
                    const valueStr = $(el).next('.factValue').text().trim().replace(',', '.').replace(/[^\d\.]/g, '');
                    const val = parseFloat(valueStr);
                    if (!isNaN(val)) {
                        if (title.includes('cal')) kcal = val;
                        if (title.includes('carb')) carbo = val;
                        if (title.includes('prot')) prot = val;
                        if (title.includes('gord') || title.includes('fat')) gord = val;
                    }
                });
            } else {
                $('.nutrient').each((_, el) => {
                    const text = $(el).text().trim().toLowerCase();
                    const nextText = $(el).next('.nutrient.right').text().trim().replace(',', '.');
                    const val = parseFloat(nextText);
                    if (!isNaN(val)) {
                        if (text.includes('energia')) {
                            const matchKcal = nextText.match(/([\d\.]+)\s*kcal/i);
                            if (matchKcal) kcal = parseFloat(matchKcal[1]);
                        }
                        if (text === 'carboidratos' || text === 'carbs') carbo = val;
                        if (text === 'proteínas' || text === 'protein') prot = val;
                        if (text === 'gorduras' || text === 'fat') gord = val;
                    }
                });
            }
        }

        nome = nome.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

        if (!nome || (!kcal && !carbo && !prot && !gord)) return null;

        return {
            nome,
            kcal: isNaN(kcal) ? 0 : kcal,
            carbo: isNaN(carbo) ? 0 : carbo,
            prot: isNaN(prot) ? 0 : prot,
            gord: isNaN(gord) ? 0 : gord,
            porcao_base_g: 100,
        };
    } catch (e) {
        clearTimeout(timeoutId);
        return null;
    }
}

async function searchAndScrapeFood(query: string) {
    try {
        const searchUrl = `https://www.fatsecret.com.br/calorias-nutri%C3%A7%C3%A3o/search?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
        });
        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);
        const relativeLink = $('a.prominent').first().attr('href');

        if (!relativeLink) return null;

        const fullUrl = `https://www.fatsecret.com.br${relativeLink}`;
        return await scrapeUrl(fullUrl);
    } catch (e) {
        return null;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { pacienteId, promptExtra, diasParaGerar = [0, 1, 2, 3, 4, 5, 6] } = await req.json();

        if (!pacienteId) {
            throw new Error('Paciente ID não fornecido.');
        }

        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing from environment!");

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceKey
        );

        // 1. Coletar perfil do paciente e metas
        const { data: perfil, error: perfilError } = await supabaseClient
            .from('usuarios_perfil')
            .select('*')
            .eq('id', pacienteId)
            .maybeSingle();

        if (perfilError) {
            throw new Error(`Erro ao buscar perfil do paciente (${pacienteId}): ${perfilError.message} / Code: ${perfilError.code}`);
        }

        // allow perfil to be null and fallback to defaults if not found

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY não configurada no servidor.');

        const diasNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const currentDaysToPrompt = diasParaGerar.map((d: number) => `${d} (${diasNames[d]})`).join(', ');

        const systemPrompt = `
Você é um Nutricionista Especialista de Inteligência Artificial de elite. Sua função é criar um plano alimentar diário **EXTREMAMENTE PRECISO** para um paciente, retornando os dados **ESTRITAMENTE em formato JSON**.

O paciente possui o seguinte perfil de metas:
- Meta Calorias: ${perfil?.meta_kcal || 2000} kcal/dia
- Meta Carboidratos: ${perfil?.meta_carbo_g || 250} g/dia
- Meta Proteínas: ${perfil?.meta_prot_g || 150} g/dia
- Meta Gorduras: ${perfil?.meta_gord_g || 55} g/dia
- Objetivo declarado: ${perfil?.objetivo || 'manter'}
- Peso atual: ${perfil?.peso_atual || '-'} kg
${promptExtra ? `\nDIRETRIZES DO NUTRICIONISTA (PRIORIDADE MÁXIMA):\n"${promptExtra}"\n` : ''}

REGRAS CRÍTICAS:
1. O plano DEVE totalizar aproximadamente ${perfil?.meta_kcal || 2000} calorias por dia. Não pode ser um plano visivelmente insuficiente (ex: apenas 500 kcal).
2. Ajuste as quantidades (quantidade_g) dos alimentos de forma realista para que a soma dos macros chegue perto das metas (+/- 5%).
3. Use alimentos simples e populares do Brasil (arroz, feijão, frango, ovo, aveia, banana, pão francês, etc).
4. Gere o planejamento para cada um destes dias da semana: ${currentDaysToPrompt}. (0 é Domingo).

O JSON RETORNADO DEVE SEGUIR ESTA ESTRUTURA:
{
  "dias": [
    {
      "dia_semana": <NUMERO>,
      "refeicoes": [
        {
          "nome_refeicao": "Café da Manhã",
          "itens": [
            { "nome_alimento": "Ovo de galinha cozido", "quantidade_g": 100 },
            { "nome_alimento": "Pão francês", "quantidade_g": 50 }
          ]
        }
      ]
    }
  ]
}
`;

        const genAI = new GoogleGenerativeAI(apiKey);

        // Lista de modelos para tentar (na ordem de preferência)
        // Usando os nomes exatos que apareceram como disponíveis no script de check
        const modelsToTry = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-flash-latest",
            "gemini-pro-latest"
        ];

        let result;
        let lastError = null;
        let usedModel = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`Tentando modelo: ${modelName}...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                });
                result = await model.generateContent(systemPrompt);
                usedModel = modelName;
                break; // Se funcionou, sai do loop
            } catch (err: any) {
                console.warn(`Falha no modelo ${modelName}: ${err.message}`);
                lastError = err;
                // Continua para o próximo modelo se for erro de modelo não encontrado ou quota
                if (err.message.includes('404') || err.message.includes('429') || err.message.includes('not found')) {
                    continue;
                }
                throw err; // Se for outro erro grave, para
            }
        }

        if (!result) {
            throw new Error(`Nenhum modelo do Gemini funcionou. Último erro: ${lastError?.message}`);
        }

        console.log(`✅ Sucesso com o modelo: ${usedModel}`);
        let responseText = result.response.text().trim();
        console.log("Gemini raw response (preview):", responseText.slice(0, 100));

        // Strip markdown blocks if Gemini returns them
        const match = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) responseText = match[1];

        let planData;
        try {
            planData = JSON.parse(responseText.trim());
        } catch (e) {
            console.error("Erro ao parsear JSON. Raw:", responseText);
            throw new Error('Falha ao parsear o JSON retornado pela IA. Tente novamente.');
        }

        // 2. Autoverificação e Scraping
        // Itera sobre todos os alimentos sugeridos
        // Cache local in-memory das promessas para não consultar e raspar a mesma coisa 2 vezes no loop
        const foodMapCache = new Map<string, any>(); // nome_alimento -> Objeto Alimento completo

        for (const dia of planData.dias) {
            for (const refeicao of dia.refeicoes) {
                for (let i = 0; i < refeicao.itens.length; i++) {
                    const item = refeicao.itens[i];
                    const cacheKey = item.nome_alimento.toLowerCase().trim();

                    if (foodMapCache.has(cacheKey)) {
                        const cachedFood = foodMapCache.get(cacheKey);
                        item.alimento_id = cachedFood.id;
                        item.alimentos = cachedFood;
                        continue;
                    }

                    // Busca no BD - Tentativa 1: Nome Completo
                    let { data: dbMatches } = await supabaseClient
                        .from('alimentos')
                        .select('*')
                        .ilike('nome', `%${item.nome_alimento}%`)
                        .limit(1);

                    // Busca no BD - Tentativa 2: Fallback para as 2 primeiras palavras (mais chance de achar arroz/feijão)
                    if (!dbMatches || dbMatches.length === 0) {
                        const words = item.nome_alimento.split(' ');
                        if (words.length > 2) {
                            const shortQuery = words.slice(0, 2).join(' ');
                            const { data: fallbackMatches } = await supabaseClient
                                .from('alimentos')
                                .select('*')
                                .ilike('nome', `%${shortQuery}%`)
                                .limit(1);
                            dbMatches = fallbackMatches;
                        }
                    }

                    if (dbMatches && dbMatches.length > 0) {
                        item.alimento_id = dbMatches[0].id;
                        item.alimentos = dbMatches[0];
                        foodMapCache.set(cacheKey, dbMatches[0]);
                    } else {
                        // Faz Scraping Autônomo
                        const scrapedData = await searchAndScrapeFood(item.nome_alimento);
                        if (scrapedData) {
                            // Insere o novo alimento no DB verificado pela IA
                            const { data: insertedFood, error: insertError } = await supabaseClient
                                .from('alimentos')
                                .insert({
                                    nome: scrapedData.nome,
                                    kcal: scrapedData.kcal,
                                    carbo: scrapedData.carbo,
                                    prot: scrapedData.prot,
                                    gord: scrapedData.gord,
                                    porcao_base_g: scrapedData.porcao_base_g,
                                    is_verified: true // Podemos marcar true pois veio de banco de dados oficial via scraper
                                })
                                .select('*')
                                .single();

                            if (insertedFood && !insertError) {
                                item.alimento_id = insertedFood.id;
                                foodMapCache.set(cacheKey, insertedFood);
                                item.alimentos = insertedFood;
                            } else {
                                // Fallback total se a inserção falhar 
                                item.failedToResolve = true;
                            }
                        } else {
                            item.failedToResolve = true; // Se não achar nem no scrape
                        }
                    }
                }
            }
        }

        return new Response(JSON.stringify(planData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("=== ERROR NO GENERATE-AI-PLAN ===");
        console.error(error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
