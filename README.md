# ZenixBlox Roulette

Sistema web completo para roleta de prêmios da ZenixBlox, com frontend público, backend, banco PostgreSQL, painel administrativo protegido, validação de keys e sorteio ponderado processado no servidor.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- JWT em cookie httpOnly
- bcrypt para hash de senha

## Funcionalidades

- Roleta pública estilo CSGO com animação horizontal.
- Giro liberado somente com nick e key válida.
- Sorteio ponderado no backend, sem confiar no navegador.
- Keys de uso único ou reutilizáveis.
- Proteção contra reutilização de key de uso único com transação no banco.
- Admin com login, cookie httpOnly e middleware de proteção.
- CRUD de itens da roleta.
- CRUD de keys.
- Histórico de giros com nick, key, prêmio e data.
- Exportação de histórico em CSV compatível com Excel.
- Seed inicial com admin, itens e keys de teste.

## Instalação local

1. Instale as dependências:

```bash
npm install
```

2. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Suba o PostgreSQL local:

```bash
docker compose up -d
```

4. Rode as migrations:

```bash
npm run db:migrate
```

5. Popule dados iniciais:

```bash
npm run db:seed
```

6. Inicie o projeto:

```bash
npm run dev
```

Acesse:

- Roleta: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Credenciais iniciais do seed:

- E-mail: `admin@zenixblox.com`
- Senha: `ZenixBlox@123`

Keys iniciais:

- `ZENIX-DEMO-1`
- `ZENIX-DEMO-2`
- `ZENIX-REUSE`

## Produção

Configure as variáveis:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/zenixblox?schema=public"
AUTH_SECRET="uma-chave-segura-com-pelo-menos-32-caracteres"
APP_URL="https://seudominio.com"
SEED_ADMIN_EMAIL="admin@zenixblox.com"
SEED_ADMIN_PASSWORD="troque-esta-senha"
```

Execute no deploy:

```bash
npm install
npm run db:deploy
npm run db:seed
npm run build
npm run start
```

## Deploy sugerido

### Railway ou Render

1. Crie um banco PostgreSQL.
2. Configure `DATABASE_URL` e `AUTH_SECRET`.
3. Build command: `npm run build`
4. Start command: `npm run start`
5. Antes do primeiro start, rode `npm run db:deploy` e `npm run db:seed`.

### Vercel

1. Crie um PostgreSQL externo, como Neon, Supabase, Railway ou Render.
2. Configure as variáveis de ambiente na Vercel.
3. Build command: `npm run build`
4. Rode `npm run db:deploy` e `npm run db:seed` em um job/terminal com as mesmas variáveis.

### VPS

1. Instale Node.js 22+ e PostgreSQL.
2. Configure `.env`.
3. Rode migrations, seed e build.
4. Use PM2 ou systemd para manter `npm run start` ativo atrás de Nginx com HTTPS.

## Observações de segurança

- Troque `AUTH_SECRET` em produção.
- Troque a senha admin logo após o primeiro login.
- Use HTTPS para proteger cookies.
- Não exponha `DATABASE_URL`.
- O sorteio acontece em `/api/spin`, dentro de transação serializável, e o frontend apenas anima o resultado recebido.
