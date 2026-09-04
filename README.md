# Hubdesk Client

Frontend da Hubdesk, plataforma open source de chamados (helpdesk), single-tenant,
com gerenciamento de usuários/roles e área de administração. Next.js (App
Router) + Tailwind CSS + shadcn/ui + TanStack Query + react-hook-form + zod.

Este app **não funciona sozinho** — depende da API em
[hubdesk-server](../hubdesk-server) (repositório irmão, publicado
separadamente). Autenticação segue o padrão BFF: os tokens JWT ficam em
cookies httpOnly geridos pelo próprio Next.js, o navegador nunca fala
diretamente com o backend.

## Rodando tudo com um comando (Docker Compose)

O `docker-compose.yml` que sobe este app junto com a API e o Postgres vive no
repositório irmão. Clone os dois lado a lado e rode a partir de lá:

```bash
git clone <url-do-hubdesk-server> hubdesk-server
git clone <url-deste-repo> hubdesk-client
cd hubdesk-server
docker compose up --build
```

Abre em `http://localhost:3000`. Veja o `README.md` do `hubdesk-server` para
como pegar as credenciais do usuário `ADMIN` criado automaticamente na
primeira subida.

## Rodando em dev (sem Docker)

Suba o `hubdesk-server` primeiro (veja o `README.md`/`CONTRIBUTING.md` dele).
Depois:

```bash
cp .env.example .env    # BACKEND_API_URL, por padrão http://localhost:3001
npm install
npm run dev              # http://localhost:3000
```

## Scripts

- `npm run dev` — modo desenvolvimento
- `npm run build` — build de produção
- `npm start` — roda o build compilado
- `npm run lint` — roda o ESLint

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query para dados do servidor
- react-hook-form + zod para formulários

## Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md).
