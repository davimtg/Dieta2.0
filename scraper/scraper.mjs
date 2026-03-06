import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILENAME = path.join(__dirname, 'dados_nutricionais.csv');
const LINKS_FILENAME = path.join(__dirname, 'links.txt');

/**
 * Realiza o scrape em uma URL específica (Vitat ou FatSecret).
 * Retorna os dados do alimento ou null em caso de falha.
 */
async function scrapeUrl(url) {
    try {
        const isVitat = url.includes('vitat.com.br');
        const isFatSecret = url.includes('fatsecret.com');

        if (!isVitat && !isFatSecret) {
            console.warn(`\x1b[33m[AVISO]\x1b[0m URL não suportada ou formato inválido (Ignorado): ${url}`);
            return null;
        }

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 10000 // 10s de timeout
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let nome = '';
        let kcal = 0, carbo = 0, prot = 0, gord = 0;

        if (isVitat) {
            nome = $('h1').first().text()?.trim() || $('title').text()?.split('-')[0]?.trim() || '';
            const nextDataScript = $('#__NEXT_DATA__').html();

            if (nextDataScript) {
                try {
                    const nextData = JSON.parse(nextDataScript);
                    const pageProps = nextData?.props?.pageProps;
                    const foodData = pageProps?.foodsData || pageProps?.foods || pageProps?.food;

                    if (foodData) {
                        nome = foodData.nome || nome;
                        kcal = parseFloat(foodData.caloria || foodData.calorias || 0);
                        carbo = parseFloat(foodData.carboidratos || 0);
                        prot = parseFloat(foodData.proteína || foodData.proteina || 0);
                        gord = parseFloat(foodData.gordurasTotais || 0);
                    }
                } catch (err) {
                    // Ignora erro e usa fallback
                }
            }

            // Fallback via JSON-LD
            if (!kcal && !carbo) {
                const jsonLd = $('script[type="application/ld+json"]').toArray();
                for (const script of jsonLd) {
                    const content = $(script).html();
                    if (content && content.includes('NutritionInformation')) {
                        try {
                            const schema = JSON.parse(content);
                            if (schema.nutrition) {
                                kcal = parseFloat(schema.nutrition.calories || 0);
                                carbo = parseFloat(schema.nutrition.carbohydrateContent || 0);
                                prot = parseFloat(schema.nutrition.proteinContent || 0);
                                gord = parseFloat(schema.nutrition.fatContent || 0);
                                nome = schema.name || nome;
                            }
                        } catch (e) { }
                    }
                }
            }
        } else if (isFatSecret) {
            nome = $('h1').first().text()?.trim() || $('title').text()?.split('|')[0]?.trim() || '';

            const factPanels = $('.factTitle').toArray();
            if (factPanels.length > 0) {
                factPanels.forEach(el => {
                    const title = $(el).text().trim().toLowerCase();
                    let valueStr = $(el).next('.factValue').text().trim().replace(',', '.');
                    valueStr = valueStr.replace(/[^\d\.]/g, '');
                    const val = parseFloat(valueStr);

                    if (!isNaN(val)) {
                        if (title.includes('cal') || title.includes('cals')) kcal = val;
                        if (title.includes('carb')) carbo = val;
                        if (title.includes('prot')) prot = val;
                        if (title.includes('gord') || title.includes('fat')) gord = val;
                    }
                });
            }

            if (!kcal && !carbo) {
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

        // Limpeza dos dados de texto para não quebrar o CSV
        nome = nome.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

        return {
            nome,
            kcal: isNaN(kcal) ? 0 : kcal,
            carbo: isNaN(carbo) ? 0 : carbo,
            prot: isNaN(prot) ? 0 : prot,
            gord: isNaN(gord) ? 0 : gord,
            url
        };

    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.warn(`\n\x1b[31m[ERRO 403]\x1b[0m Acesso bloqueado pelo Cloudflare na URL: ${url}`);
        } else {
            console.warn(`\n\x1b[31m[ERRO]\x1b[0m Falha ao extrair ${url} - ${error.message}`);
        }
        return null;
    }
}

async function main() {
    console.log(`\x1b[36m=== Scraper Nutricional (Vitat & FatSecret) ===\x1b[0m\n`);

    let urls = [];
    if (fs.existsSync(LINKS_FILENAME)) {
        const fileContent = fs.readFileSync(LINKS_FILENAME, 'utf-8');
        urls = fileContent.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('http'));
        console.log(`📥 Lendo ${urls.length} links do arquivo links.txt...`);
    } else {
        console.log(`⚠️ Arquivo links.txt não encontrado. Criando um de exemplo...`);
        urls = [
            'https://vitat.com.br/alimentacao/busca-de-alimentos/alimentos/1034-aveia-em-flocos',
            'https://www.fatsecret.com.br/calorias-nutri%C3%A7%C3%A3o/gen%C3%A9rico/ovo-(inteiro)?portionid=13897&portionamount=1,000'
        ];
        fs.writeFileSync(LINKS_FILENAME, urls.join('\n') + '\n', 'utf-8');
    }

    if (urls.length === 0) {
        console.log(`\x1b[33mSua lista está vazia. Adicione URLs no arquivo links.txt e rode novamente.\x1b[0m`);
        return;
    }

    const results = [];
    let count = 1;

    for (const url of urls) {
        process.stdout.write(`⏳ Processando [${count}/${urls.length}]: ${url.substring(0, 50)}... `);

        const data = await scrapeUrl(url);

        if (data) {
            results.push(data);
            console.log(`\x1b[32mOK!\x1b[0m`);
        }
        count++;

        // Intervalo de 1,5 segundos entre as requests para evitar bloqueio por rate limit / bot
        if (count <= urls.length) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    if (results.length > 0) {
        // As vírgulas são delimitadores do CSV, por isso utilizamos aspas duplas ao redor do nome p/ evitar conflitos.
        const csvHeader = 'Nome,Calorias (kcal),Carboidratos (g),Proteínas (g),Gorduras (g),Fonte (URL)\n';
        const csvRows = results.map(r => {
            const safeName = `"${r.nome.replace(/"/g, '""')}"`;
            return `${safeName},${r.kcal},${r.carbo},${r.prot},${r.gord},${r.url}`;
        });

        fs.writeFileSync(CSV_FILENAME, csvHeader + csvRows.join('\n'), 'utf-8');
        console.log(`\n🎉 \x1b[32mExtração finalizada com sucesso!\x1b[0m`);
        console.log(`📁 Foram salvos ${results.length} alimentos em: \x1b[36m${CSV_FILENAME}\x1b[0m`);
    } else {
        console.log(`\n\x1b[31mNenhum dado pôde ser extraído das URLs fornecidas.\x1b[0m`);
    }
}

main();
