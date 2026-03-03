import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { url } = await req.json()

        if (!url) {
            throw new Error('URL não fornecida.')
        }

        const isVitat = url.includes('vitat.com.br');
        const isFatSecret = url.includes('fatsecret.com');

        if (!isVitat && !isFatSecret) {
            throw new Error('URL inválida. Forneça um link válido do Vitat ou FatSecret.')
        }

        // Add a 5-second timeout to prevent the Edge Function from getting forcefully killed (502 Gateway Error)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Acesso bloqueado pelo site (Cloudflare/403). Tente copiar os macros manualmente deste link.');
            }
            throw new Error('Erro ao acessar a página. Status: ' + response.status)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        let nome = ''
        let marca = ''
        let kcal = 0, carbo = 0, prot = 0, gord = 0, porcao_base_g = 100, imagem_url = null

        if (isVitat) {
            nome = $('h1').first().text()?.trim() || $('title').text()?.split('-')[0]?.trim() || ''

            // Busca pelo State hidratado do Next.js onde ficam as informações do banco de dados deles
            const nextDataScript = $('#__NEXT_DATA__').html()

            if (nextDataScript) {
                try {
                    const nextData = JSON.parse(nextDataScript)
                    const pageProps = nextData?.props?.pageProps
                    // Costuma estar em foodsData ou foods
                    const foodData = pageProps?.foodsData || pageProps?.foods

                    if (foodData) {
                        nome = foodData.nome || nome
                        kcal = parseFloat(foodData.caloria || foodData.calorias || 0)
                        carbo = parseFloat(foodData.carboidratos || 0)
                        prot = parseFloat(foodData.proteína || foodData.proteina || 0)
                        gord = parseFloat(foodData.gordurasTotais || 0)
                        imagem_url = foodData.imageUrl || null
                    }
                } catch (err) {
                    console.error("Erro ao parsear __NEXT_DATA__: ", err)
                }
            }

            // Fallback para Regex do HTML puro de SEO estruturado, caso o __NEXT_DATA__ falhe ou não exista
            if (!kcal && !carbo) {
                const jsonLd = $('script[type="application/ld+json"]').toArray()
                for (const script of jsonLd) {
                    const content = $(script).html()
                    if (content && content.includes('NutritionInformation')) {
                        try {
                            const schema = JSON.parse(content)
                            if (schema.nutrition) {
                                kcal = parseFloat(schema.nutrition.calories || 0)
                                carbo = parseFloat(schema.nutrition.carbohydrateContent || 0)
                                prot = parseFloat(schema.nutrition.proteinContent || 0)
                                gord = parseFloat(schema.nutrition.fatContent || 0)
                                nome = schema.name || nome
                                if (schema.image && schema.image !== "null") imagem_url = schema.image
                            }
                        } catch (e) { }
                    }
                }
            }
        }
        else if (isFatSecret) {
            // FatSecret Logic
            nome = $('h1').first().text()?.trim() || $('title').text()?.split('|')[0]?.trim() || ''
            marca = $('.manufacturer').text()?.trim() || $('.manufacturer a').text()?.trim() || ''

            // Looking for serving size
            const servingText = $('.serving_size_value').text() || $('.serving_size.black.serving_size_value').text() || '';
            const servingMatch = servingText.match(/([\d,.]+)\s*(g|ml)/i);
            if (servingMatch) {
                porcao_base_g = parseFloat(servingMatch[1].replace(',', '.'));
            }

            // Extract values directly from factValue class or nutrient classes
            // Example structured HTML: 
            // <div class="factTitle">Cals</div> <div class="factValue">58</div>
            // <div class="factTitle">Carbs</div> <div class="factValue">9,2g</div>

            const factPanels = $('.factTitle').toArray();
            if (factPanels.length > 0) {
                factPanels.forEach(el => {
                    const title = $(el).text().trim().toLowerCase();
                    const valueStr = $(el).next('.factValue').text().trim().replace(',', '.');
                    const val = parseFloat(valueStr);

                    if (!isNaN(val)) {
                        if (title.includes('cal') || title.includes('cals')) kcal = val;
                        if (title.includes('carb')) carbo = val;
                        if (title.includes('prot')) prot = val;
                        if (title.includes('gord') || title.includes('fat')) gord = val;
                    }
                });
            }

            // Fallback for list details view
            if (!kcal) {
                $('.nutrient').each((_, el) => {
                    const text = $(el).text().trim().toLowerCase();
                    const nextText = $(el).next('.nutrient.right').text().trim().replace(',', '.');
                    const val = parseFloat(nextText);

                    if (!isNaN(val)) {
                        if (text.includes('energia')) {
                            // Can be kj or kcal, but next sibling usually has both, or it is explicitly kcal
                            const matchKcal = nextText.match(/([\d,.]+)\s*kcal/i);
                            if (matchKcal) kcal = parseFloat(matchKcal[1].replace(',', '.'));
                        }
                        if (text === 'carboidratos' || text === 'carbs') carbo = val;
                        if (text === 'proteínas' || text === 'protein') prot = val;
                        if (text === 'gorduras' || text === 'fat') gord = val;
                    }
                });
            }
        }

        return new Response(
            JSON.stringify({
                nome,
                marca,
                kcal,
                carbo,
                prot,
                gord,
                porcao_base_g,
                imagem_url
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error: any) {
        let errorMessage = error.message || 'Erro inesperado ao raspar página.'
        if (error.name === 'AbortError') {
            errorMessage = 'O site demorou muito para responder e a conexão foi encerrada. Tente novamente mais tarde.'
        }

        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
