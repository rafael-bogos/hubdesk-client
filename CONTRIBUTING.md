# Contribuindo com o hubdesk-client

Obrigado pelo interesse em contribuir! Este é o frontend da Hubdesk (Next.js App
Router). O backend fica em [hubdesk-server](../hubdesk-server) (repositório
irmão, publicado separadamente) — este app não funciona sozinho.

## Rodando localmente

Suba o `hubdesk-server` primeiro (veja o `CONTRIBUTING.md` dele). Depois:

```bash
cp .env.example .env    # BACKEND_API_URL, por padrão http://localhost:3001
npm install
npm run dev              # http://localhost:3000
```

## Padrões do projeto

- **Autenticação é BFF (backend-for-frontend):** o navegador nunca fala
  diretamente com o `hubdesk-server` nem guarda tokens em `localStorage`. Os
  tokens JWT ficam em cookies httpOnly setados pelos Route Handlers em
  `src/app/api/auth/*`. Chamadas autenticadas do lado do cliente passam pelo
  proxy genérico `src/app/api/backend/[...path]`, que anexa o header
  `Authorization` a partir do cookie e renova o token automaticamente em 401.
- **`getSession()`** (`src/lib/session.ts`) é a fonte de verdade real da
  sessão/role — consulta `GET /auth/me` no backend a cada chamada em vez de
  decodificar o JWT no cliente. Use-a em layouts server-side para checagem de
  role; não reimplemente essa lógica.
- **A UI nunca duplica regra de autorização real** — só esconde controles que o
  backend rejeitaria. A fonte de verdade é sempre a resposta da API.
- Componentes de UI: shadcn/ui + Tailwind. Dados de servidor: TanStack Query.
  Formulários: react-hook-form + zod resolver.
- Este projeto usa Next.js 16 — `middleware.ts` foi renomeado para `proxy.ts`
  (exporta uma função `proxy`, não `middleware`). Não recrie um `middleware.ts`.

## Antes de abrir um PR

```bash
npm run lint
npm run build
```

Não há testes automatizados de UI hoje — teste manualmente no navegador o fluxo
que você alterou (não só confie no build passar).

## Commits

Segue [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `chore:`, `docs:`.

## Reportando bugs / sugerindo features

Use os templates de issue do GitHub.
