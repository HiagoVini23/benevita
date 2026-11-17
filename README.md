<p align="center">
  <img src="frontend/public/favicon.svg" alt="Benevita" width="88" height="88" />
</p>

<h1 align="center">Benevita</h1>

<p align="center">Agendamento de exames e acesso a laudos para clínicas.</p>

---

> **Status:** fundação pronta (modelo de dados, autenticação, catálogo, telas de login). Agendamentos, laudos e área do paciente em desenvolvimento.

## Sobre

Aplicação web em que a **equipe da clínica** agenda exames e cadastra/publica laudos, e o **paciente** consulta seus próprios agendamentos e laudos publicados.

O nome junta _bene_ (bem) e _vita_ (vida), do latim, e guarda **Benedito**, sobrenome do autor. O símbolo é um B que brota: a folha de cima tem uma linha de batimento como nervura (o exame) e a de baixo é o cuidado que vem depois (o laudo).

## Stack

| Camada    | Tecnologia                                                                         |
| --------- | ---------------------------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite, React Router, TanStack Query, shadcn/ui + Tailwind CSS |
| Backend   | Node.js, TypeScript, Fastify 5, Zod                                                |
| Banco     | PostgreSQL 17 (Docker), Prisma 7                                                   |
| Testes    | Vitest, Testing Library, `fastify.inject` contra PostgreSQL real                   |
| Qualidade | ESLint (typescript-eslint strict type-checked), Prettier                           |

Monorepo com **npm workspaces** (`backend/` e `frontend/`).

## Pré-requisitos

- Node.js 22+ (recomendado 24, ver `.nvmrc`)
- npm 10+
- Docker (para o PostgreSQL)

## Como rodar

```bash
# 1. Dependências (também gera o Prisma Client)
npm install

# 2. Variáveis de ambiente
cp .env.example .env

# 3. Banco: sobe o PostgreSQL, aplica as migrations e carrega os dados fictícios
npm run db:up
npm run db:migrate -w backend
npm run db:seed -w backend

# 4. Aplicação, um terminal para cada
npm run dev:backend    # http://localhost:3333
npm run dev:frontend   # http://localhost:5173
```

O frontend usa o proxy do Vite: chamadas para `/api` são encaminhadas ao backend, sem necessidade de CORS em desenvolvimento.

## Contas de demonstração

Criadas pelo seed (`npm run db:seed -w backend`):

| Perfil            | E-mail                | Senha         |
| ----------------- | --------------------- | ------------- |
| Equipe da clínica | `equipe@benevita.dev` | `equipe123`   |
| Paciente          | `ana@benevita.dev`    | `paciente123` |
| Paciente          | `bruno@benevita.dev`  | `paciente123` |
| Paciente          | `carla@benevita.dev`  | `paciente123` |

O seed é idempotente: recria usuários, tipos de exame (Raio-X, Ultrassom, Ressonância Magnética, Tomografia) e profissionais, e **recria os agendamentos e laudos** relativos à data de hoje (exames passados com laudo publicado e em rascunho, futuros e um cancelado).

## Testes

```bash
npm test                    # backend + frontend
npm run test -w backend     # só backend
npm run check               # format + lint + typecheck + testes
```

Os testes do backend são de integração contra um **PostgreSQL real**, num banco separado (`benevita_test`, criado e migrado automaticamente; configurável por `TEST_DATABASE_URL`). O banco é limpo antes de cada teste, e a suíte se recusa a rodar se apontar para o banco de desenvolvimento.

## Comandos

| Comando                         | Descrição                                  |
| ------------------------------- | ------------------------------------------ |
| `npm run dev:backend`           | Backend em modo watch (porta 3333)         |
| `npm run dev:frontend`          | Frontend em modo watch (porta 5173)        |
| `npm run build`                 | Build de produção dos dois workspaces      |
| `npm run check`                 | Format check + lint + typecheck + testes   |
| `npm test`                      | Testes dos dois workspaces                 |
| `npm run lint` / `lint:fix`     | ESLint                                     |
| `npm run format`                | Prettier                                   |
| `npm run db:up` / `db:down`     | Sobe/derruba o PostgreSQL                  |
| `npm run db:migrate -w backend` | Cria/aplica migrations em desenvolvimento  |
| `npm run db:seed -w backend`    | Carrega os dados fictícios                 |
| `npm run db:reset -w backend`   | Recria o banco do zero (migrations + seed) |

## Estrutura

```text
.
├── backend/
│   ├── prisma/             # schema, migrations e seed
│   └── src/
│       ├── app.ts          # montagem do Fastify (testável via inject)
│       ├── server.ts       # entrypoint HTTP
│       ├── features/       # código organizado por funcionalidade
│       ├── shared/         # config, erros, banco, auth, tempo
│       └── test/           # app de teste, factories, setup do banco
├── frontend/
│   └── src/
│       ├── features/       # telas e lógica por funcionalidade
│       ├── components/     # componentes do app e ui/ (shadcn)
│       ├── lib/            # cliente HTTP, datas, React Query
│       └── test/           # render com providers
├── docker-compose.yml
└── .env.example
```

## Fuso horário

- O banco armazena todos os instantes em **UTC** (`timestamptz`), e a API troca datas em **ISO 8601 UTC**.
- A clínica opera em **`America/Sao_Paulo`**: horários digitados, horário comercial e filtros por dia são interpretados nesse fuso.
- A interface **sempre exibe no horário de Brasília**, independente do fuso do navegador.

## Decisões técnicas

- **Regras críticas garantidas pelo banco, não só pelo código.** Requisições simultâneas passam juntas por verificações feitas no código, então:
  - **Um agendamento ativo por horário:** índice único **parcial** em `scheduled_at WHERE status = 'SCHEDULED'`. Barra agendamentos simultâneos e libera o horário de um cancelado.
  - **Horários alinhados em :00/:30:** `CHECK` no banco. Sem ele, um 14:15 conviveria com o 14:00 na mesma sala.
  - **Um laudo por agendamento:** `UNIQUE` em `appointment_id`.
  - **Laudo publicado tem data e autor de publicação:** `CHECK`.
  - **Cancelar × publicar laudo ao mesmo tempo:** as operações travam a linha do agendamento (`SELECT ... FOR UPDATE`) dentro de uma transação, e por isso rodam uma de cada vez.
- **IDs UUID v7:** ordenados no tempo, então as inserções no índice são sequenciais, como num inteiro autoincremento, e ainda podem ser expostos na URL sem revelar volume. Um esquema híbrido (`bigint` interno + UUID público) foi descartado por dobrar as colunas de identidade sem ganho nesta escala.
- **Fastify + Zod:** validação declarada na rota, tipos inferidos do schema e schema de **resposta** que impede vazamento de campos (ex.: conteúdo de rascunho, hash de senha).
- **Autorização no backend:** cada rota exige perfil (`STAFF`/`PATIENT`). Rotas do paciente usam apenas o `patientId` do token, nunca um id enviado pelo cliente.
- **Autenticação:** JWT no header `Authorization`, guardado no `localStorage`. É simples e adequado ao escopo; a limitação é que um XSS poderia ler o token (alternativa: cookie `httpOnly` + proteção CSRF). O login responde com o mesmo erro e o mesmo custo de bcrypt para e-mail inexistente e senha errada, para não revelar quais contas existem.
- **Relógio injetável:** "agora" vem de um único `Clock`, o que torna testáveis as regras dependentes de tempo (ex.: não agendar no passado).
- **Erros padronizados:** `{ "error": { "code", "message", "details?" } }`, com mensagens em pt-BR definidas uma vez por situação. Erros inesperados retornam 500 genérico sem detalhes internos.
- **Cadastros fora do escopo:** pacientes, tipos de exame e profissionais vêm do seed (tabelas próprias, sem CRUD), e o laudo referencia o profissional por chave estrangeira em vez de texto livre.
- **Frontend:** organização por feature, TanStack Query para dados do servidor e shadcn/ui (estilo Luma) com a identidade visual do Benevita.

## Pendências

- [x] Modelo de dados, migrations e constraints
- [x] Autenticação e autorização por perfil
- [x] Seed com dados fictícios e contas de demonstração
- [ ] Agendamentos
- [ ] Laudos (rascunho/publicação)
- [ ] Área do paciente
- [ ] Testes dos cenários obrigatórios
- [ ] Limitações conhecidas e tempo dedicado
