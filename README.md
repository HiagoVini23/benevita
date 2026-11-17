<p align="center">
  <img src="frontend/public/favicon.svg" alt="Benevita" width="88" height="88" />
</p>

<h1 align="center">Benevita</h1>

<p align="center">Agendamento de exames e acesso a laudos para clínicas.</p>

---

> **Status:** setup inicial do projeto. Funcionalidades em desenvolvimento.

## Sobre

Aplicação web em que a **equipe da clínica** agenda exames e cadastra/publica laudos, e o **paciente** consulta seus próprios agendamentos e laudos publicados.

O nome vem de **Bene**dito + **vita** (vida, em latim) — "boa vida".

## Stack

| Camada    | Tecnologia                                                       |
| --------- | ---------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite                                       |
| Backend   | Node.js, TypeScript, Fastify 5, Zod                              |
| Banco     | PostgreSQL 17 (Docker), Prisma 7                                 |
| Testes    | Vitest, Testing Library, `fastify.inject`                        |
| Qualidade | ESLint (typescript-eslint strict), Prettier, GitHub Actions (CI) |

Monorepo com **npm workspaces** (`backend/` e `frontend/`).

## Pré-requisitos

- Node.js 22+ (recomendado 24 — ver `.nvmrc`)
- npm 10+
- Docker (para o PostgreSQL)

## Como rodar

```bash
# 1. Dependências (também gera o Prisma Client)
npm install

# 2. Variáveis de ambiente
cp .env.example .env

# 3. Banco de dados
npm run db:up

# 4. Aplicação (backend em http://localhost:3333, frontend em http://localhost:5173)
npm run dev
```

O frontend usa o proxy do Vite: chamadas para `/api` são encaminhadas ao backend, sem necessidade de CORS em desenvolvimento.

## Comandos

| Comando                         | Descrição                                 |
| ------------------------------- | ----------------------------------------- |
| `npm run dev`                   | Backend + frontend em modo watch          |
| `npm run build`                 | Build de produção dos dois workspaces     |
| `npm run check`                 | Format check + lint + typecheck + testes  |
| `npm test`                      | Testes dos dois workspaces                |
| `npm run lint` / `lint:fix`     | ESLint                                    |
| `npm run format`                | Prettier                                  |
| `npm run db:up` / `db:down`     | Sobe/derruba o PostgreSQL                 |
| `npm run db:migrate -w backend` | Cria/aplica migrations em desenvolvimento |
| `npm run db:reset -w backend`   | Recria o banco do zero                    |

## Estrutura

```text
.
├── backend/
│   ├── prisma/             # schema e migrations
│   └── src/
│       ├── app.ts          # montagem do Fastify (testável via inject)
│       ├── server.ts       # entrypoint HTTP
│       ├── features/       # código organizado por funcionalidade
│       └── shared/         # config (env validado), erros, banco
├── frontend/
│   └── src/
│       ├── features/       # telas e lógica por funcionalidade
│       ├── components/     # UI compartilhada
│       └── lib/            # infraestrutura compartilhada
├── docker-compose.yml
└── .env.example
```

## Decisões técnicas

- **Fastify + Zod:** validação declarada na própria rota, `req.body` tipado a partir do schema e schema de **resposta** que impede vazamento de campos (ex.: conteúdo de rascunho). Testes de integração com `app.inject()` sem subir porta.
- **PostgreSQL:** a regra "um agendamento ativo por horário" precisa resistir a requisições simultâneas — será garantida por constraint no banco, não apenas por verificação no código.
- **Organização por feature:** código de uma funcionalidade fica junto; `shared/` só para o que é usado por várias.
- **Erros padronizados:** toda resposta de erro segue `{ "error": { "code", "message", "details?" } }`. Erros inesperados retornam 500 genérico sem detalhes internos.
- **Variáveis de ambiente validadas** na inicialização (Zod) — a aplicação não sobe com configuração inválida.
- **Um único `.env`** na raiz, compartilhado por backend, Prisma e Vite.

## Pendências

- [ ] Modelo de dados e migrations
- [ ] Autenticação e autorização por perfil
- [ ] Agendamentos
- [ ] Laudos (rascunho/publicação)
- [ ] Área do paciente
- [ ] Seed com dados fictícios e contas de demonstração
- [ ] Testes dos cenários obrigatórios
- [ ] Documentar fuso horário adotado, limitações e tempo dedicado
