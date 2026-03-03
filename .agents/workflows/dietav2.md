---
description: Agente Full-Stack focado em construir a versão V2 funcional do Nutriplanner, integrando a interface responsiva com o banco de dados Supabase e gerenciamento de estado.
---

# Contexto da Atualização (Fase 6 - Automação de Cadastro e Upload de Fotos)
Você vai implementar duas features muito importantes para a experiência do usuário (UX) nas telas de cadastro de Alimentos e Receitas.

# 1. Ajuste no Banco de Dados (Supabase)
- Antes de tudo, execute via código (ou instrua o usuário a rodar no SQL Editor) o comando para adicionar a coluna de imagem na tabela de alimentos: `ALTER TABLE public.alimentos ADD COLUMN IF NOT EXISTS imagem_url TEXT;`
- Crie ou instrua a criação de um "Storage Bucket" público no Supabase chamado `media`.

# 2. Upload de Imagem e Câmera Nativa
- Nas telas de "Criar/Editar Alimento" e "Criar/Editar Receita", substitua o input de texto de URL de imagem por um componente de Upload de Arquivo real.
- **Integração Mobile:** Use o atributo HTML nativo `<input type="file" accept="image/*" capture="environment" />`. No celular, isso dará a opção ao usuário de escolher da Galeria ou Tirar uma Foto na hora.
- **Fluxo:** Ao selecionar a imagem, o app deve fazer o upload do arquivo para o Supabase Storage (bucket `media`), pegar a "Public URL" gerada, exibi-la como preview na tela e salvar essa URL no banco de dados na hora do `INSERT`/`UPDATE`.

# 3. Auto-preenchimento via Link (Web Scraping na API)
- Na tela de "Criar Alimento", adicione uma seção: "Preenchimento Rápido (Opcional)".
- Deve conter um input para colar o link do Vitat (ex: `https://vitat.com.br/...`) e um botão "Extrair Dados".
- **O Desafio do CORS:** O front-end React não pode dar um `fetch` direto no Vitat por conta de políticas de CORS.
- **A Solução:** Crie uma rota de backend no nosso app (ex: uma API Route se for Next.js, ou uma Serverless Function simples/Edge Function no Supabase). 
  - O front-end envia o link para essa rota.
  - A rota faz o `fetch` no Vitat, usa `cheerio` ou expressões regulares simples para varrer o HTML, captura os valores (Calorias, Carbo, Prot, Gord) calculados por 100g, e devolve um JSON para o front-end.
  - O front-end pega esse JSON e preenche automaticamente os inputs do formulário usando o hook do React Hook Form.

# Instruções de Execução
Gere os componentes de formulário com o botão de câmera integrado. Desenvolva o código da Rota de API do Web Scraper. Utilize tratamento de erro visual (Toasts) caso o link do Vitat seja inválido ou a foto seja muito grande.