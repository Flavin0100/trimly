# Trimly

SaaS de agendamento inteligente para barbearias, desenvolvido com Next.js, React, TypeScript, Drizzle ORM e PostgreSQL/Neon.

## Desenvolvimento local

1. Copie `.env.example` para `.env` e informe a `DATABASE_URL` do Neon.
2. Instale as dependências com `npm install`.
3. Execute `npm run db:migrate`.
4. Inicie com `npm run dev`.

## Deploy na Vercel

1. Importe o repositório no painel da Vercel.
2. Mantenha o preset **Next.js** e o diretório raiz `./`.
3. Em **Storage**, conecte um banco Neon ao projeto.
4. Confirme que a variável `DATABASE_URL` foi criada para Production, Preview e Development.
5. Execute o deploy. O comando configurado em `vercel.json` aplica as migrations antes do build.

## Comandos

- `npm run dev` — ambiente de desenvolvimento.
- `npm run build` — build de produção.
- `npm run db:generate` — gera migrations após alterações de schema.
- `npm run db:migrate` — aplica migrations no PostgreSQL.
