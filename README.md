<p align="center">
  <img src="frontend/public/favicon.svg" alt="Benevita" width="88" height="88" />
</p>

<h1 align="center">Benevita</h1>

<p align="center">Agendamento de exames e acesso a laudos para clínicas.</p>

---

Aplicação web em que a **equipe da clínica** agenda exames e cadastra/publica laudos, e o **paciente** consulta seus próprios agendamentos e laudos publicados. Desenvolvida como desafio técnico.

O nome junta _bene_ (bem) e _vita_ (vida), do latim, e guarda **Benedito**, sobrenome do autor. O símbolo é um B que brota: a folha de cima tem uma linha de batimento como nervura (o exame) e a de baixo é o cuidado que vem depois (o laudo).

## Sumário

- [Como rodar](#como-rodar)
- [Contas de demonstração](#contas-de-demonstração)
- [Roteiro de demonstração](#roteiro-de-demonstração)
- [Testes](#testes)
- [Funcionalidades e regras](#funcionalidades-e-regras)
- [API](#api)
- [Fuso horário](#fuso-horário)
- [Decisões técnicas](#decisões-técnicas)
- [Limitações e pendências](#limitações-e-pendências)
- [Desenvolvimento com IA](#desenvolvimento-com-ia)
- [Tempo dedicado](#tempo-dedicado)

## Stack

| Camada    | Tecnologia                                                                         |
| --------- | ---------------------------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite, React Router, TanStack Query, shadcn/ui + Tailwind CSS |
| Backend   | Node.js, TypeScript, Fastify 5, Zod                                                |
| Banco     | PostgreSQL 17 (Docker), Prisma 7                                                   |
| Testes    | Vitest, Testing Library, `fastify.inject` contra PostgreSQL real                   |
| Qualidade | ESLint (typescript-eslint strict type-checked), Prettier                           |

Monorepo com **npm workspaces** (`backend/` e `frontend/`), um único `package-lock.json` e um único `.env` na raiz.

## Como rodar

**Pré-requisitos:** Node.js 22+ (recomendado 24, ver `.nvmrc`), npm 10+ e Docker.

```bash
# 1. Dependências (também gera o Prisma Client)
npm install

# 2. Variáveis de ambiente (os valores do exemplo funcionam com o docker-compose)
cp .env.example .env

# 3. Banco: sobe o PostgreSQL, aplica as migrations e carrega os dados fictícios
npm run db:up
npm run db:migrate -w backend
npm run db:seed -w backend

# 4. Aplicação, um terminal para cada
npm run dev:backend    # API em http://localhost:3333
npm run dev:frontend   # App em http://localhost:5173
```

Abra **http://localhost:5173**. O frontend usa o proxy do Vite: chamadas para `/api` vão ao backend, sem CORS em desenvolvimento.

Para recriar o banco do zero (migrations + seed): `npm run db:reset -w backend`.

## Contas de demonstração

| Perfil            | E-mail                | Senha         |
| ----------------- | --------------------- | ------------- |
| Equipe da clínica | `equipe@benevita.dev` | `equipe123`   |
| Paciente          | `ana@benevita.dev`    | `paciente123` |
| Paciente          | `bruno@benevita.dev`  | `paciente123` |
| Paciente          | `carla@benevita.dev`  | `paciente123` |

O seed é idempotente. Ele recria usuários, tipos de exame (Raio-X, Ultrassom, Ressonância Magnética, Tomografia) e profissionais, e **recria os agendamentos e laudos relativos à data de hoje**. Rodar `npm run db:seed -w backend` de novo restaura o cenário de demonstração.

## Roteiro de demonstração

O seed prepara este cenário (datas relativas ao dia em que ele roda):

1. **Equipe** (`equipe@benevita.dev`): a lista abre em **hoje**, com três exames (em dias úteis). Use os filtros de data e paciente, ou "Todas as datas".
2. **Novo agendamento**: escolha paciente, exame, um dia útil e um dos horários livres. Tente o mesmo horário em outra aba: a segunda tentativa é recusada.
3. **Laudo**: no Ultrassom da **Carla** do dia útil anterior (exame já realizado, sem laudo), "Cadastrar laudo", salve o rascunho e **publique**. Depois de publicado, o laudo fica somente leitura e o agendamento não pode mais ser cancelado. Em um exame futuro, o rascunho é permitido, mas a publicação só libera após o horário do exame.
4. **Paciente** (`carla@benevita.dev`): em "Meus exames", a Carla vê só os próprios exames e abre o laudo recém-publicado. A **Ana** já tem um laudo publicado (Raio-X).
5. **Rascunho invisível** (`bruno@benevita.dev`): o Bruno tem um laudo em rascunho (Ressonância), que aparece para ele como "Laudo ainda não disponível". Ele também não vê nada da Ana, nem chamando a API direto (`GET /api/me/appointments/<id da Ana>/report` responde 404).

## Testes

```bash
npm test                    # backend + frontend
npm run test -w backend     # só backend
npm run check               # format + lint + typecheck + testes (verificação completa)
```

Os testes do backend são de **integração contra um PostgreSQL real**, num banco separado (`benevita_test`, criado e migrado automaticamente; configurável por `TEST_DATABASE_URL`). O banco é limpo antes de cada teste, e a suíte se recusa a rodar se apontar para o banco de desenvolvimento. O Docker precisa estar no ar (`npm run db:up`).

**Cenários obrigatórios do desafio**

| Cenário                                                               | Teste                                                                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| T1. Duas tentativas simultâneas no mesmo horário: apenas uma é aceita | `backend/src/features/appointments/appointments.routes.test.ts` · _accepts only one of two simultaneous bookings_     |
| T2. Paciente consulta laudo de outro paciente: acesso negado          | `backend/src/features/patient-portal/patient-portal.routes.test.ts` · _denies access to another patient's report_     |
| T3. Paciente acessa um rascunho: conteúdo não disponibilizado         | `backend/src/features/patient-portal/patient-portal.routes.test.ts` · _does not disclose the content of a draft_      |
| T4. Laudo publicado passa a estar disponível para o paciente correto  | `backend/src/features/patient-portal/patient-portal.routes.test.ts` · _makes a report available to the right patient_ |
| T5. Tentativa de agendar no passado é rejeitada                       | `backend/src/features/appointments/appointments.routes.test.ts` · _rejects booking in the past and persists nothing_  |

Além deles: constraints do banco testadas diretamente (`constraints.test.ts`), regras de horário em testes unitários, a corrida **cancelar × publicar** (10 pares simultâneos; o teste falha se a trava for removida), respostas 404 idênticas para "outro paciente", "rascunho" e "inexistente", e testes das telas com Testing Library.

## Funcionalidades e regras

**Agendamento (equipe)**

- Seleciona paciente cadastrado, tipo de exame, data e horário. Consulta e filtra por data e paciente. Cancela.
- **Sala única, horários fixos de 30 minutos** (:00 e :30), de **segunda a sexta, das 08:00 às 18:00** (último horário às 17:30), horário de Brasília.
- Não permite agendar no passado, nem dois agendamentos ativos no mesmo horário. O horário de um agendamento cancelado pode ser reutilizado.

**Laudos (equipe)**

- Título, texto e profissional responsável. Salvo como **rascunho** (editável, visível só para a equipe) e depois **publicado**, com confirmação.
- Um laudo por agendamento. Laudo publicado não pode ser editado. Agendamento cancelado não recebe laudo. Agendamento com laudo publicado não pode ser cancelado.
- Registra a **data de publicação** e quem publicou.
- O rascunho pode ser preparado a qualquer momento, mas a **publicação só é permitida depois do horário do exame** (regra adicional: um laudo descreve um exame já realizado).

**Acesso do paciente**

- Lista os próprios agendamentos (tipo de exame, data e situação), separados em próximos e anteriores.
- Identifica quais exames têm laudo **publicado** e abre o laudo. Rascunhos nunca aparecem.
- Não acessa agendamentos ou laudos de outro paciente.

## API

Base `/api`, autenticação por `Authorization: Bearer <jwt>`. Erros sempre no formato `{ "error": { "code", "message" } }`.

| Método | Rota                                         | Perfil   | Descrição                                              |
| ------ | -------------------------------------------- | -------- | ------------------------------------------------------ |
| POST   | `/auth/login`                                | público  | Login, devolve `{ token, user }`                       |
| GET    | `/auth/me`                                   | qualquer | Usuário autenticado                                    |
| GET    | `/patients`, `/exam-types`, `/professionals` | equipe   | Cadastros para os formulários                          |
| GET    | `/appointments?date=&patientId=`             | equipe   | Lista e filtra agendamentos                            |
| GET    | `/appointments/available-slots?date=`        | equipe   | Horários livres do dia                                 |
| POST   | `/appointments`                              | equipe   | Agenda (`201`; `409 SLOT_TAKEN`)                       |
| GET    | `/appointments/:id`                          | equipe   | Detalhe do agendamento                                 |
| POST   | `/appointments/:id/cancel`                   | equipe   | Cancela                                                |
| GET    | `/appointments/:id/report`                   | equipe   | Laudo (inclui rascunho)                                |
| PUT    | `/appointments/:id/report`                   | equipe   | Cria ou edita o rascunho                               |
| POST   | `/appointments/:id/report/publish`           | equipe   | Publica                                                |
| GET    | `/me/appointments`                           | paciente | Próprios agendamentos                                  |
| GET    | `/me/appointments/:id/report`                | paciente | Próprio laudo publicado (`404` em qualquer outro caso) |

Status: `400` validação ou regra de horário · `401` não autenticado · `403` perfil sem permissão · `404` não encontrado · `409` conflito de estado (horário ocupado, laudo já publicado, agendamento cancelado, exame ainda não realizado).

## Fuso horário

- O banco armazena todos os instantes em **UTC** (`timestamptz`), e a API troca datas em **ISO 8601 UTC**.
- A clínica opera em **`America/Sao_Paulo`** (horário de Brasília): horário comercial, horários livres e filtros por dia são interpretados nesse fuso.
- A interface **sempre exibe no horário de Brasília**, independente do fuso do navegador, e informa isso na tela.

## Decisões técnicas

- **Regras críticas garantidas pelo banco, não só pelo código.** Duas requisições simultâneas passam juntas por verificações feitas no código, então:
  - **Um agendamento ativo por horário:** índice único **parcial** em `scheduled_at WHERE status = 'SCHEDULED'`. Barra agendamentos simultâneos (T1) e libera o horário de um cancelado.
  - **Horários alinhados em :00/:30:** `CHECK` no banco. Sem ele, um 14:15 conviveria com o 14:00 na mesma sala.
  - **Um laudo por agendamento:** `UNIQUE` em `appointment_id`.
  - **Laudo publicado tem data e autor da publicação:** `CHECK`.
  - **Cancelar × publicar ao mesmo tempo:** a regra envolve duas tabelas, então salvar rascunho, publicar e cancelar começam com `SELECT ... FOR UPDATE` na linha do agendamento, dentro de uma transação. As operações sobre o mesmo agendamento rodam uma de cada vez, e cada uma enxerga o resultado da anterior.
- **Autorização sempre no backend:** cada rota exige perfil (`STAFF`/`PATIENT`). As rotas do paciente usam apenas o `patientId` do token e filtram por ele **dentro da própria consulta**. Para um laudo que não pode ser mostrado, a resposta é a mesma (`404 REPORT_NOT_FOUND`) seja de outro paciente, rascunho ou inexistente: o paciente não descobre nem que ele existe.
- **Fastify + Zod:** validação declarada na rota, tipos inferidos do schema e schema de **resposta** que impede vazamento de campos (hash de senha, texto de rascunho, ids internos da equipe).
- **Autenticação:** JWT no header `Authorization`, guardado no `localStorage`. O login responde com o mesmo erro e o mesmo custo de bcrypt para e-mail inexistente e senha errada, para não revelar quais contas existem.
- **IDs UUID v7:** ordenados no tempo, então as inserções no índice são sequenciais como num autoincremento, e os ids podem ir para a URL sem revelar volume. Um esquema híbrido (`bigint` interno + UUID público) foi descartado por dobrar as colunas de identidade sem ganho nesta escala.
- **Relógio injetável:** "agora" vem de um único `Clock`, o que torna testáveis as regras dependentes de tempo.
- **Erros padronizados:** mensagens em pt-BR definidas uma vez por situação, com códigos estáveis para o frontend decidir. Erros inesperados retornam 500 genérico, sem detalhes internos.
- **Cadastros via seed:** pacientes, tipos de exame e profissionais têm tabelas próprias, sem telas de cadastro (fora do escopo pedido). O laudo referencia o profissional por chave estrangeira, em vez de texto livre, para evitar grafias diferentes do mesmo médico.
- **Frontend:** organizado por feature (componente → hook → cliente da API), TanStack Query para dados do servidor, shadcn/ui (estilo Luma) com a identidade visual do Benevita.

## Limitações e pendências

**Limitações conhecidas**

- **Token no `localStorage`:** simples e adequado ao escopo, mas um XSS poderia lê-lo. Em produção: cookie `httpOnly` com proteção CSRF.
- **Sem limite de tentativas de login** (rate limiting) nem renovação de token: a sessão dura `JWT_EXPIRES_IN` (8h).
- **Listagem sem paginação:** `GET /api/appointments` sem filtro de data devolve todos os agendamentos. Em produção: paginação por cursor (o UUID v7 já é ordenado no tempo).
- **Sem status "realizado":** o modelo tem apenas agendado e cancelado, porque o desafio não pede registrar a realização. No portal do paciente, exames passados aparecem no histórico identificados pelo laudo (disponível ou ainda não).
- **Regras de agenda espelhadas na UI:** o calendário bloqueia fins de semana e dias passados para orientar o usuário; quem valida é o backend.
- **Aviso do driver nos testes:** o `@prisma/adapter-pg` emite um `DeprecationWarning` do `pg` em escritas aninhadas do Prisma. É interno da biblioteca e não afeta o comportamento.

**Pendências / próximos passos**

- Telas de cadastro de pacientes, profissionais e tipos de exame.
- Registro de realização do exame (status "realizado") e reagendamento.
- Cookie `httpOnly`, rate limiting no login e auditoria de acessos aos laudos.
- Pipeline de CI rodando `npm run check`.
- Fora do escopo pedido: PDF do laudo, anexos e assinatura digital.

## Desenvolvimento com IA

O projeto foi desenvolvido com **Claude Code** (vibe coding), com o autor conduzindo as decisões e a IA implementando dentro de regras explícitas:

- **Planejamento antes do código:** requisitos do PDF resumidos em regras numeradas (R1–R4, L1–L7, T1–T5), contrato da API escrito antes das telas, e toda decisão relevante (modelo de dados, UUID v7, `FOR UPDATE`, biblioteca de UI, identidade visual) discutida e aprovada pelo autor.
- **Regras de engenharia por contexto:** instruções de arquitetura, qualidade, backend, frontend, banco e testes carregadas conforme o arquivo editado (configuração do agente mantida fora do repositório).
- **Automação em vez de memória:** um hook formatava (Prettier) e validava (ESLint strict) cada arquivo a cada edição, devolvendo os erros para correção imediata.
- **Revisão a cada fase:** ao fim de cada feature, duas revisões independentes (o `/code-review` do Claude Code e um agente revisor com as regras de negócio), com os achados discutidos e corrigidos antes do commit. Vários bugs reais foram pegos assim, como a corrida cancelar × publicar e um erro de UI que apagava a mensagem de "horário ocupado".
- **Verificação:** `npm run check` verde a cada commit, um clone limpo do repositório testado seguindo este README e o fluxo completo exercitado pela API real.

## Tempo dedicado

Aproximadamente **12 horas**, incluindo planejamento, identidade visual, implementação, testes, revisões e documentação.
