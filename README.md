# Hubdesk Client

Frontend da Hubdesk, plataforma open source de chamados (helpdesk), single-tenant,
com gerenciamento de usuários/roles e área de administração. Next.js (App
Router) + Tailwind CSS + shadcn/ui + TanStack Query + react-hook-form + zod.

Este app **não funciona sozinho** — depende da API em
[hubdesk-server](../hubdesk-server) (repositório irmão, publicado
separadamente). Autenticação segue o padrão BFF: os tokens JWT ficam em
cookies httpOnly geridos pelo próprio Next.js, o navegador nunca fala
diretamente com o backend.

## Rodando com Docker Compose

Suba o `hubdesk-server` primeiro (tem seu próprio `docker-compose.yml`, veja o
`README.md` dele — inclui como pegar as credenciais do `ADMIN` criado
automaticamente). Depois, deste repositório:

```bash
docker compose up --build
```

Por padrão aponta para `http://host.docker.internal:3001`. Se a API estiver
rodando em outro host/porta, defina `BACKEND_API_URL` num `.env` ao lado do
`docker-compose.yml` antes do `up`. Abre em `http://localhost:3000`.

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
