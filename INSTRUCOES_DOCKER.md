# 🐳 Guia de Implantação com Docker (Dieta2.0)

Este documento descreve o passo a passo completo de como construir, rodar e gerenciar sua aplicação utilizando Docker localmente.

---

## 📋 1. Pré-Requisitos

Antes de iniciar, certifique-se de que o servidor local possui os seguintes itens instalados:

1. **Docker Desktop** (no Windows ou Mac) ou **Docker Engine** (no Linux)
2. A aplicação já rodando precisa do daemon do Docker ativo no fundo. Teste o comando no terminal do seu computador:
   ```bash
   docker --version
   ```

---

## 🚀 2. Subindo a Aplicação pela Primeira Vez

A configuração completa (Front-end Vitest + Servidor Nginx) foi simplificada e agora é controlada através do arquivo `docker-compose.yml`.

Para criar a build da aplicação (o processo que converte seu React/TypeScript para arquivos puros otimizados) e iniciar tudo de uma única vez, abra seu terminal na **raiz do projeto (pasta Dieta2)** e rode:

```bash
docker compose up -d --build
```

**O que esse comando faz?**
- `up`: Sobe (ou cria) os containers definidos no *docker-compose.yml*.
- `-d` (Detached): Roda a aplicação em segundo plano (background). Dessa forma o seu terminal fica livre.
- `--build`: Força a criação limpa "do zero" a partir da versão mais recente dos seus arquivos de código atuais.

### Acessando sua Aplicação
Assim que o comando terminar no terminal (pode demorar de 1 a 3 minutos da primeira vez para o `npm ci` baixar todas as dependências), a aplicação estará viva rodando na porta `8080`.

Acesse no seu navegador preferido a URL local:
👉 **[http://localhost:8080/](http://localhost:8080/)**

---

## 🛠️ 3. Comandos Úteis no Dia-a-Dia 

Aqui estão os principais comandos de terminal e ações comuns que você poderão precisar no futuro enquanto lida com seu contâiner. Todos exigem que você esteja na respectiva pasta (`Dieta2`).

### Parar e deligar a aplicação (Sem deletar nada)
Se quiser apenas interromper a aplicação sem perder a "build" rápida contida nela, utilize:
```bash
docker compose stop
```

### Voltar a ligar a aplicação 
Roda em segundos porque não reconstrói do código novamente:
```bash
docker compose start
```

### Encerrar o container e deletar os recursos atrelados
Útil quando você vai fechar de vez a configuração e precisa liberar os recursos de contêiners antigos na máquina:
```bash
docker compose down
```

### Visualizar Logs e Erros 
Se a página do servidor ficou branca ou quiser ver os logs em tempo real do Nginx, use o comando:
```bash
docker compose logs -f
```
*(Para sair pressione `Ctrl + C`)*.

---

## ⚙️ 4. Como atualizar o servidor após escrever Novos Códigos?

Quando você ou a sua equipe **mudarem o código fonte** da aplicação (adicionar uma nova tela, alterar o CSS, atualizar a lógica), o Docker **não** atualizará sozinho na sua tela imediatamente. 

Você precisa forçar a engrenagem a construir o projeto novamente contendo o seu novo código, fazendo:

```bash
# Derrube a versão antiga primeiro:
docker compose down

# Recrie e instale o novo código atualizado:
docker compose up -d --build
```

---

## 🔧 5. Como alterar a Porta Padrão (8080)

Se quiser acessar o seu projeto usando algo diferente de `localhost:8080` (exemplo: `80`, `3000`, etc), modifique diretamente no seu arquivo `docker-compose.yml`:

Por exemplo, altere a parte de `ports` de `"8080:80"` para `"3000:80"`:

```yaml
# dentro do docker-compose.yml
    ports:
      - "3000:80"        # <--- Esquerda é o localhost // Direita (80) o contêiner. NUNCA altere a direita!
```

E em seguida, atualize o servidor forçando uma nova build: `docker compose up -d`.
