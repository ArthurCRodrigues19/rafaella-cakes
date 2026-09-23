# 🎂 Rafaella Cakes: loja virtual e encomendas

[![CI](https://github.com/ArthurCRodrigues19/rafaella-cakes/actions/workflows/ci.yml/badge.svg)](https://github.com/ArthurCRodrigues19/rafaella-cakes/actions/workflows/ci.yml)

Site completo de uma doceria artesanal, com vitrine, loja virtual (carrinho, checkout, Pix e cartão), encomendas personalizadas com orçamento, conta do cliente e **painel administrativo** para a dona da loja gerenciar tudo sozinha.

| | |
|---|---|
| **Frontend** | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS |
| **Backend** | Node.js · Express · TypeScript · Zod |
| **Banco** | PostgreSQL 16 · Prisma ORM |
| **Pagamentos** | Mercado Pago (Pix + cartão via Card Payment Brick), com **modo de demonstração** embutido |
| **E-mail** | Nodemailer (SMTP), com Mailpit para ver os e-mails em desenvolvimento |
| **Infra local** | Docker Compose (PostgreSQL + Mailpit) |

## ✨ Funcionalidades

- **Loja:** home com destaques, cardápio com categorias, busca, filtros e ordenação, página de produto com variações (tamanho/sabor), avaliações, galeria, depoimentos, contato com mapa e WhatsApp, e feed do Instagram.
- **Compras:** carrinho persistente, frete por zonas de CEP ou retirada grátis, data de entrega com prazo mínimo configurável, pagamento com Pix ou cartão, e-mails automáticos e acompanhamento do status (recebido → em preparo → pronto → entregue).
- **Encomendas personalizadas:** formulário com data do evento, sabores, tamanho e foto de referência. A dona da loja envia o orçamento pelo painel, e o cliente aprova e paga pelo site.
- **Conta do cliente:** cadastro/login (Google opcional), recuperação de senha, histórico de pedidos e encomendas, endereços e favoritos.
- **Painel admin:** dashboard (faturamento, mais vendidos, pendências), pedidos, encomendas, produtos com fotos e variações, categorias, clientes, moderação de avaliações, galeria e configurações da loja (prazos, dias de funcionamento, zonas de frete).

---

## 🚀 Como rodar localmente

### Pré-requisitos

| Programa | Para quê | Download |
|---|---|---|
| **Node.js 20+** | Rodar o site e a API | https://nodejs.org (versão **LTS**) |
| **Docker Desktop** | Banco de dados e caixa de e-mails | https://www.docker.com/products/docker-desktop |
| **Git** | Baixar o projeto | https://git-scm.com |

> **Windows:** o Docker Desktop precisa do WSL 2. Se ele não ligar, veja [Problemas comuns](#-problemas-comuns).

### Passo a passo

**1. Baixe o projeto e entre na pasta:**

```bash
git clone https://github.com/ArthurCRodrigues19/rafaella-cakes.git
```

```bash
cd rafaella-cakes
```

**2. Crie o arquivo de configuração** a partir do exemplo:

```bash
cp .env.example .env
```

> No PowerShell do Windows: `Copy-Item .env.example .env`. Os valores padrão já funcionam localmente. Troque o `JWT_SECRET` por um texto longo e aleatório.

**3. Instale as dependências:**

```bash
npm install
```

**4. Com o Docker Desktop aberto, suba o banco e a caixa de e-mails:**

```bash
npm run db:up
```

**5. Crie as tabelas e os dados de exemplo:**

```bash
npm run setup
```

Esse comando cria 6 categorias, 23 produtos com variações, avaliações, galeria, zonas de frete, pedidos e encomendas de exemplo.

**6. Rode o projeto:**

```bash
npm run dev
```

| Endereço | O que é |
|---|---|
| http://localhost:3000 | 🍰 **Site da loja** |
| http://localhost:3000/admin | 🔐 **Painel administrativo** |
| http://localhost:8025 | ✉️ **Caixa de e-mails** (todos os e-mails enviados aparecem aqui) |
| http://localhost:4000/api/health | Status da API |

### 🔑 Usuários de teste (criados pelo seed)

| Papel | E-mail | Senha |
|---|---|---|
| **Admin** | `admin@rafaellacakes.com.br` | `Rafaella@2026` |
| **Cliente** | `cliente@exemplo.com` | `Cliente@2026` |

> ⚠️ Essas senhas são públicas. **Troque antes de expor o site na internet** (veja `npm run admin:create` abaixo).

### 🧪 Roteiro rápido de teste

1. Entre como **cliente**, adicione produtos ao carrinho, informe o CEP `05433-000` (zona de entrega) e finalize o pedido.
2. Na tela do pedido, gere o **Pix** e clique em **"Simular pagamento aprovado"**. O status muda sozinho e o e-mail de confirmação aparece em http://localhost:8025.
3. Envie uma **encomenda personalizada** em `/encomendas`, com uma foto de referência.
4. No **/admin**: veja o dashboard, avance o status do pedido (o cliente recebe e-mail), abra a encomenda, defina um preço e clique em **"Enviar orçamento"**.
5. Volte como cliente em **Minha conta → Encomendas**, aprove o orçamento e pague.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | API (porta 4000) e site (porta 3000) em modo desenvolvimento |
| `npm run db:up` / `npm run db:down` | Liga / desliga o PostgreSQL e o Mailpit (os dados ficam salvos) |
| `npm run setup` | Cria as tabelas e roda o seed |
| `npm run db:seed` | Recria os dados de exemplo (**apaga os dados atuais**) |
| `npm run db:reset` | Apaga o banco inteiro, recria as tabelas e roda o seed |
| `npm run db:studio` | Abre o Prisma Studio para ver e editar o banco no navegador |
| `npm run admin:create -- --email x@y.com --name "Nome"` | Cria um admin ou promove um usuário existente. Sem `--password`, gera uma senha forte |
| `npm run demo` | Build de produção do site + API. Mais rápido para mostrar a alguém |
| `npm run tunnel` | Cria um **link público temporário** (`https://...trycloudflare.com`) para o site local |
| `npm run build` | Build de produção da API e do site |

### 🌐 Mostrar o site para alguém (link temporário)

Sem hospedar nada: o link aponta para o seu computador e funciona enquanto ele estiver ligado.

1. Instale o cloudflared (uma vez só): `winget install Cloudflare.cloudflared`
2. Em um terminal, rode `npm run demo` e espere o site subir.
3. Em outro terminal, rode `npm run tunnel` e copie o link `https://...trycloudflare.com` que aparece.

O painel fica no mesmo link, com `/admin` no final. O link muda a cada vez que o túnel é reiniciado.

---

## 🩺 Problemas comuns

| Sintoma | Solução |
|---|---|
| `npm.ps1 não pode ser carregado... execução de scripts desabilitada` | No PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, ou use o Prompt de Comando. |
| npm 11+ avisa que *"packages have install scripts not yet covered by allowScripts"* | Os pacotes necessários (Prisma e esbuild) já estão liberados em `allowScripts` no `package.json`. Se atualizar as versões deles, rode `npm install-scripts approve prisma @prisma/client @prisma/engines esbuild`. |
| Docker: *"Virtual Machine Platform not enabled"* | No PowerShell **como administrador**: `wsl --install --no-distribution` e reinicie o PC. Se travar em 0%, cancele e rode `wsl --update --web-download`. |
| Docker fica eternamente em *"starting"* | Feche o Docker Desktop, rode `wsl --shutdown` e abra de novo. |
| `Can't reach database server at localhost:5432` | O banco não está ligado: abra o Docker e rode `npm run db:up`. |
| Porta 5432 já em uso | Já existe um PostgreSQL instalado. Pare esse serviço ou mude a porta no `docker-compose.yml` e na `DATABASE_URL`. |
| Erros `EPERM` no `npm install` | Evite deixar o projeto dentro do OneDrive/Dropbox: a sincronização trava os arquivos. |

**Sem Docker?** Instale o [PostgreSQL 16](https://www.postgresql.org/download/), crie um banco `rafaella_cakes` e ajuste a `DATABASE_URL` no `.env`. Sem o Mailpit, os e-mails apenas não são enviados: o sistema registra um aviso e continua funcionando.

---

## 💳 Pagamentos (Mercado Pago)

**Sem chaves configuradas, o site funciona em modo de demonstração**: o Pix gera um código fictício e há botões para simular a aprovação. Nenhuma cobrança real acontece.

Para usar o Mercado Pago:

1. Crie uma aplicação em https://www.mercadopago.com.br/developers/panel/app
2. Copie as **credenciais de teste** (depois, as de produção) para o `.env`:
   ```
   MP_ACCESS_TOKEN=TEST-xxxxxxxx
   MP_PUBLIC_KEY=TEST-xxxxxxxx
   ```
3. Reinicie o `npm run dev`. O checkout passa a usar o **Pix real** (QR Code) e o **Card Payment Brick** (formulário de cartão seguro do MP, em que os dados do cartão nunca passam pelo nosso servidor).
4. **Webhooks (confirmação automática):** o Mercado Pago precisa de uma URL pública `https`. Em desenvolvimento, use um túnel e configure:
   ```
   MP_NOTIFICATION_URL=https://SEU-TUNEL/api/webhooks/mercadopago
   MP_WEBHOOK_SECRET=chave-secreta-do-painel-de-webhooks
   ```
   Sem webhook, o site **consulta o status automaticamente** enquanto o cliente está na tela do pedido.

> Use os [cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/test/cards) no ambiente de testes.

---

## 📸 Instagram

A home tem a seção **"Siga-nos"** com os posts mais recentes. **Sem token, aparecem posts de exemplo.** Para conectar a conta real:

1. No app do Instagram, transforme o perfil da doceria em **conta profissional** (Comercial ou Criador de conteúdo).
2. Em https://developers.facebook.com, crie um app do tipo **Empresa** e adicione o produto **Instagram → "API com login do Instagram"**.
3. Em *Instagram → Configuração da API*, adicione a conta da doceria e clique em **Gerar token**.
4. Cole o token no `.env` (`INSTAGRAM_ACCESS_TOKEN=...`) e reinicie a API.

O token de longa duração vale 60 dias e **é renovado automaticamente** pela API (uma vez por dia, enquanto houver acessos). O feed fica em cache por 30 minutos.

---

## 🔐 Login com Google (opcional)

1. Em https://console.cloud.google.com → *APIs e serviços → Credenciais*, crie um **ID do cliente OAuth** (tipo "Aplicativo da Web").
2. Em **URIs de redirecionamento autorizados**, adicione: `http://localhost:3000/api/auth/google/callback`
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`. O botão "Continuar com Google" aparece automaticamente.

---

## 🏗️ Arquitetura

```
rafaella-cakes/
├── apps/
│   ├── api/                        # Backend (Express + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Modelo de dados
│   │   │   ├── migrations/         # Histórico de alterações do banco
│   │   │   └── seed.ts             # Dados de exemplo
│   │   ├── scripts/create-admin.ts # Cria/promove administradores
│   │   ├── uploads/                # Imagens enviadas pelo painel (não versionadas)
│   │   └── src/
│   │       ├── config/env.ts       # Variáveis de ambiente validadas com Zod
│   │       ├── lib/                # Prisma, e-mail, templates, gateway de pagamento, uploads, sessão
│   │       ├── middlewares/        # Autenticação/papéis, rate limit, tratamento de erros
│   │       ├── modules/            # Um módulo por domínio
│   │       │   ├── auth/           #   routes → controller → service → schemas
│   │       │   ├── products/       #   routes → service → repository
│   │       │   ├── orders/         #   pricing, pedidos, pagamentos, webhook
│   │       │   ├── customOrders/   #   encomendas personalizadas (orçamentos)
│   │       │   ├── users/          #   conta: perfil, endereços, favoritos, carrinho salvo
│   │       │   ├── shipping/       #   CEP (ViaCEP) e zonas de frete
│   │       │   ├── reviews/        #   avaliações e depoimentos
│   │       │   ├── content/        #   configurações públicas, galeria, Instagram, contato
│   │       │   └── admin/          #   rotas do painel + dashboard
│   │       ├── utils/              # Erros, datas, sanitização de texto
│   │       ├── app.ts              # Montagem do Express
│   │       └── server.ts
│   └── web/                        # Frontend (Next.js)
│       └── src/
│           ├── app/
│           │   ├── (site)/         # Loja: home, cardápio, produto, carrinho, checkout, encomendas, galeria, contato, conta
│           │   └── admin/          # Painel: login + (panel)/ dashboard, pedidos, encomendas, produtos...
│           ├── components/         # UI reutilizável, providers (auth, carrinho, favoritos, toasts)
│           └── lib/                # Cliente da API, tipos, formatação
├── scripts/tunnel.mjs              # Link público temporário (Cloudflare Tunnel)
├── .github/workflows/ci.yml        # CI: tipos, migrations, seed e build a cada push
├── docker-compose.yml
├── .env.example
└── package.json                    # Monorepo (npm workspaces)
```

### Decisões importantes

- **Front e back separados, mesma origem.** O navegador fala só com o Next (`localhost:3000`), que repassa `/api/*` e `/uploads/*` para a API. Com isso, o cookie de sessão é `httpOnly` + `SameSite=Lax` sem configurações complexas de CORS, e a API pode ser hospedada separadamente no futuro.
- **Camadas.** Os módulos principais (auth, produtos, pedidos, encomendas) seguem *rotas → controller → service → repository*. Nos módulos pequenos (galeria, configurações, zonas), o service acessa o Prisma diretamente, para evitar camadas vazias.
- **Preço calculado sempre no servidor.** O carrinho do navegador envia apenas `variantId` e quantidade. Preço, estoque, frete e prazo são recalculados pela API a partir do banco.
- **Dinheiro em centavos (`Int`).** Evita erros de arredondamento.
- **Pedido só é confirmado com pagamento aprovado.** A aprovação (via cartão, webhook ou consulta ao MP) é aplicada numa transação que muda o status, baixa o estoque e confirma a encomenda vinculada, **uma única vez** (proteção contra webhooks duplicados).
- **Cópia dos dados no pedido.** Nome e preço dos itens e o endereço ficam gravados no pedido: editar um produto depois não altera pedidos antigos.
- **Encomenda → orçamento → pedido.** A solicitação personalizada vira um orçamento. Quando o cliente aprova, ela gera um pedido comum que usa o mesmo fluxo de pagamento da loja.
- **Carrinho persistente.** Visitantes: `localStorage`. Logados: salvo no banco e mesclado ao fazer login (disponível em qualquer dispositivo).
- **Prazo de entrega configurável.** Data mínima = hoje + o maior prazo entre o padrão da loja e o de cada produto, respeitando os dias de funcionamento. Encomendas têm prazo próprio.

### Segurança

- Senhas com **bcrypt** (12 rounds). Tempo de resposta constante no login, para não revelar quais e-mails existem.
- Sessão **JWT em cookie httpOnly**. `tokenVersion` permite encerrar todas as sessões (troca/redefinição de senha).
- **Papéis** `CUSTOMER` e `ADMIN`: todas as rotas `/api/admin/*` exigem ADMIN no servidor, além da proteção de tela no front.
- **Rate limiting**: login (8 tentativas/15 min), cadastro, recuperação de senha, contato e encomendas, além de um limite geral.
- **Validação com Zod** em todas as entradas, com sanitização de HTML nos textos livres. O React escapa toda saída (proteção contra **XSS**).
- **Prisma** com queries parametrizadas (proteção contra **SQL injection**).
- **Helmet** e cabeçalhos de segurança. Uploads só de imagens (JPG/PNG/WEBP, até 5 MB), com nome aleatório.
- Token de recuperação de senha aleatório, guardado como **hash SHA-256**, válido por 1 hora e de uso único.
- Webhook do Mercado Pago com validação da **assinatura HMAC**. O status é sempre reconsultado na API do MP.
- Redirecionamentos após login só para caminhos internos (evita *open redirect*).
- O `.env` (chaves e senhas) nunca é versionado: só o `.env.example`, com valores de exemplo.

### SEO, performance e acessibilidade

- Metadados por página (`title`, `description`, Open Graph, canonical), `sitemap.xml`, `robots.txt` e dados estruturados **JSON-LD** (Bakery e Product).
- Páginas públicas renderizadas no servidor com cache incremental (ISR).
- `next/image`: lazy loading, WebP/AVIF e tamanhos responsivos. Fontes self-hosted com `next/font`.
- Imagens com fallback ilustrado caso uma foto falhe.
- Mobile first. Links "pular para o conteúdo", foco visível, rótulos em todos os campos, `aria-live` nas notificações, contraste AA na paleta e respeito a `prefers-reduced-motion`.

### Identidade visual

| Cor | Hex | Uso |
|---|---|---|
| Creme | `#FFF9F4` | Fundo |
| Rosa blush | `#F4D6D6` | Destaques, seções |
| Rosa antigo | `#A95E65` | Links, detalhes |
| Champagne | `#D4B483` | Ornamentos, estrelas |
| Café | `#4A3228` | Textos e botões |

Tipografia: **Playfair Display** (títulos), **Great Vibes** (detalhes manuscritos) e **Inter** (texto).

> As fotos são placeholders do [Unsplash](https://unsplash.com). Pelo painel (**Produtos** e **Galeria**), dá para enviar as fotos reais.

---

## ☁️ Hospedagem definitiva (resumo)

- **Banco:** PostgreSQL gerenciado (Neon, Supabase, Railway...). Rode `npm run prisma:deploy -w apps/api`.
- **API:** qualquer host Node (Railway, Render, Fly.io, VPS) com `npm run build -w apps/api` e `npm run start -w apps/api`. Os uploads devem ir para um armazenamento persistente (troque `lib/storage.ts` por S3/Cloudinary).
- **Site:** Vercel ou outro host Node, com `API_URL` apontando para a API e `WEB_URL` para o domínio.
- Use `NODE_ENV=production` (ativa cookies `Secure`), um `JWT_SECRET` forte, credenciais de produção do Mercado Pago e um SMTP real.
