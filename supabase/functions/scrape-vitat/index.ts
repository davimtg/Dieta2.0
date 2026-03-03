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

        if (!url || !url.includes('vitat.com.br')) {
            throw new Error('URL inválida. Forneça um link válido do Vitat.')
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        })

        if (!response.ok) {
            throw new Error('Erro ao acessar a página do Vitat. Status: ' + response.status)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Busca pelo State hidratado do Next.js onde ficam as informações do banco de dados deles
        const nextDataScript = $('#__NEXT_DATA__').html()

        let nome = $('h1').first().text()?.trim() || $('title').text()?.split('-')[0]?.trim() || ''
        let kcal = 0, carbo = 0, prot = 0, gord = 0, porcao_base_g = 100, imagem_url = null

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

                    // Frequentemente eles usavam 'quantidadePadrao' e 'medidaPadrao', vamos fixar em 100g ou usar a base deles se obvia.
                    // Para evitar confusão, vamos normalizar por 100 caso n seja explícito
                    // Vitat tipicamente apresenta em 100g no App mas pode vir quebrado na web.
                    // Vamos tentar assumir 100g para manter o padrão se não houver um campo weight em G.
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

        return new Response(
            JSON.stringify({
                nome,
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
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
