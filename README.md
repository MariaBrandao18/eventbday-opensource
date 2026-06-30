# 🎂 EventBday — Open-Source

Template **Next.js 14 fullstack** para gerenciar eventos pessoais e aniversários,
feito para ser **clonado e self-hosted por qualquer pessoa**. Crie um evento, monte o
RSVP, mostre a lista de presença pública, gerencie uma lista de presentes anônima e
crie enquetes — **sem contas de usuário, sem provedor de e-mail pago e sem lock-in de
fornecedor**.

> Esta é a camada **open-source** do EventBday (modelo open-core). Ela **não inclui**
> envio de e-mail, autenticação de usuário, lembretes agendados nem dashboard
> multi-conta — esses recursos pertencem à camada SaaS privada.

## ✨ Como funciona o acesso (sem login)

Não há sistema de contas. O acesso é resolvido por **posse de token/chave**:

| Papel | Como acessa | Mecanismo |
|---|---|---|
| **Organizador** | Define `ADMIN_TOKEN` no `.env` e entra em `/admin` | Comparação direta do token, sem login/sessão de usuário |
| **Convidado** | Recebe o link `/e/{slug}/guest?token=XXX` exibido na tela após o RSVP | Token único por linha na tabela `guests`, validado em Server Action |
| **Visitante** | Abre a página pública do evento `/e/{slug}` | Leitura pública, sem token |

Como cada instância self-hosted serve um único organizador, a chave única por instância
é suficiente e evita toda a complexidade de um sistema de contas.

### Fluxo de confirmação sem e-mail
1. O convidado preenche o formulário público de RSVP.
2. Uma Server Action grava o convidado e gera um `token` único.
3. A própria tela exibe o **link de acesso do convidado** com um botão de copiar — é
   responsabilidade do convidado salvar o link (não há reenvio automático por e-mail).

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Backend | Next.js Server Actions (`'use server'`) |
| Banco de dados | **PostgreSQL puro** (qualquer provedor) via [`postgres`](https://github.com/porsager/postgres) |
| ORM | Nenhum — SQL direto |
| Acesso do organizador | `ADMIN_TOKEN` (variável de ambiente) |
| Acesso do convidado | Token único por linha em `guests` |
| E-mail | **Nenhum** |
| Validação | Zod |
| Estilo | CSS customizado (sem framework de UI) |

## 🚀 Self-hosting

### 1. Pré-requisitos
- Node.js 20+
- Uma instância PostgreSQL (local, [Supabase](https://supabase.com), [Railway](https://railway.app),
  [Neon](https://neon.tech), Docker, etc.)

### 2. Clonar e instalar
```bash
git clone https://github.com/MariaBrandao18/eventbday-opensource.git
cd eventbday-opensource
npm install
```

### 3. Configurar variáveis de ambiente
Copie o exemplo e preencha:
```bash
cp .env.example .env.local
```

```env
# String de conexão do seu PostgreSQL
DATABASE_URL=postgres://usuario:senha@localhost:5432/eventbday

# Chave de administração da instância (gere com: openssl rand -hex 32)
ADMIN_TOKEN=uma-chave-secreta-bem-longa

# URL pública da instância — usada para montar os links de convite
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> Não há variáveis de e-mail (`RESEND_API_KEY`) nem de provedor de auth gerenciado
> (`SUPABASE_*`, `NEXTAUTH_*`).

### 4. Aplicar o schema no banco
As migrations são **SQL puro** em [`db/migrations/`](db/migrations). Aplique com o script incluído:
```bash
npm run db:migrate
```
Ou rode o SQL manualmente no seu cliente Postgres:
```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_schema.sql
```

### 5. Iniciar em desenvolvimento
```bash
npm run dev
# http://localhost:3000
```

Acesse `/admin`, informe seu `ADMIN_TOKEN` e crie seu primeiro evento.

## 📂 Estrutura do projeto

```
app/
  (public)/e/[slug]/         → Página pública do evento + RSVP
  (public)/e/[slug]/guest/   → Área do convidado (token validado em Server Action)
  admin/                     → Área do organizador (protegida por ADMIN_TOKEN)
actions/                     → Server Actions (admin, events, guests, gifts, polls, supplies)
components/                  → Componentes React (RsvpModal, GuestAreaTabs, CountdownTimer, ...)
lib/
  db.ts                      → Cliente PostgreSQL puro
  admin-auth.ts              → Comparação simples de ADMIN_TOKEN (não é sistema de auth)
  validations.ts             → Schemas Zod
  utils.ts                   → Helpers (slug, token, datas)
db/migrations/               → Migrations SQL puras, numeradas
scripts/migrate.mjs          → Runner de migrations
```

## 🗄️ Banco de dados

| Tabela | Descrição |
|---|---|
| `events` | Eventos da instância (sem `organizer_id` — a instância é de um único organizador) |
| `guests` | Convidados — `token` único exibido na tela após o RSVP |
| `gifts` | Lista de presentes (o `guest_id` é interno e **nunca** exposto em query pública) |
| `polls` / `poll_options` / `poll_votes` | Enquetes com visibilidade configurável |
| `supplies` / `supply_signups` | Lista de insumos e inscrições |

Não existem as tabelas `profiles`, `email_logs` nem `audit_logs` — não há contas de
usuário nem envio de e-mail nesta camada.

## 🔐 Decisões de segurança e privacidade

- **Anonimato da lista de presentes** — a Server Action de listagem retorna apenas
  `{ id, description, status }`; o `guest_id` é resolvido internamente a partir do token
  e nunca chega ao client.
- **Token do convidado** validado em Server Action (não em middleware), buscando
  `guest` por `token` + `status = CONFIRMED`.
- **Cookie de admin** `httpOnly` comparado diretamente com `ADMIN_TOKEN`.
- **Reserva de presentes** com `UPDATE` atômico condicional, evitando race condition.
- **Slug** validado com `/^[a-z0-9-]+$/` antes de persistir.
- **`.env.example`** sem chaves reais nem referência a qualquer projeto privado.

## 🗺️ URLs

| URL | Descrição |
|---|---|
| `/` | Landing da instância |
| `/e/{slug}` | Página pública do evento com RSVP |
| `/e/{slug}/guest?token=...` | Área do convidado (token) |
| `/admin` | Área do organizador (`ADMIN_TOKEN`) |
| `/admin/events/new` | Criar evento |
| `/admin/events/{slug}` | Gerenciar evento |

## ☁️ Deploy

Funciona em qualquer lugar que rode Next.js: Vercel, Railway, VPS, Docker. Basta
configurar `DATABASE_URL`, `ADMIN_TOKEN` e `NEXT_PUBLIC_BASE_URL` no provedor e aplicar
as migrations no banco de produção.

## 📄 Licença

Open-source. Use, modifique e hospede livremente.
