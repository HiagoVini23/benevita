<p align="center">
  <img src="frontend/public/favicon.svg" alt="Benevita" width="88" height="88" />
</p>

<h1 align="center">Benevita</h1>

<p align="center">Agendamento de exames e acesso a laudos para clínicas.</p>

---

A **equipe da clínica** agenda exames e cadastra/publica laudos; o **paciente** consulta seus próprios agendamentos e laudos publicados.

O nome junta _bene_ (bem) e _vita_ (vida), do latim, e guarda **Benedito**, sobrenome do autor.

## Sumário

- [Como rodar](#como-rodar)
- [Contas de demonstração](#contas-de-demonstração)
- [Testes](#testes)
- [Fuso horário](#fuso-horário)
- [Decisões técnicas](#decisões-técnicas)
- [Limitações e pendências](#limitações-e-pendências)
- [Tempo dedicado](#tempo-dedicado)

## Como rodar

**Pré-requisitos:** Node.js 22+ (recomendado 24, ver `.nvmrc`), npm 10+ e Docker.

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente (os valores do exemplo funcionam com o docker-compose)
cp .env.example .env

# 3. Banco: sobe o PostgreSQL, aplica as migrations e carrega os dados fictícios
npm run db:up
npm run db:deploy -w backend
npm run db:seed -w backend

# 4. Aplicação, um terminal para cada
npm run dev:backend    # API em http://localhost:3333
npm run dev:frontend   # App em http://localhost:5173
```

Abra **http://localhost:5173**. Para recriar o banco do zero (migrations + dados fictícios): `npm run db:reset -w backend`.

O seed é idempotente: recria usuários, pacientes, tipos de exame e profissionais, e recria os agendamentos e laudos relativos à data de hoje (exames de hoje, passados com laudo publicado, em rascunho e sem laudo, futuros e um cancelado).

A tela da equipe abre no dia de hoje. Como a clínica não funciona no fim de semana, num sábado ou domingo a lista começa vazia: use o filtro de data para ver os outros dias.

**Porta 5432 ocupada?** Se já houver um PostgreSQL local, o `db:up` falha com _port is already allocated_. Pare o serviço local ou troque a porta publicada no `docker-compose.yml` (ex.: `'5433:5432'`) e use a mesma porta em `DATABASE_URL` e `TEST_DATABASE_URL` no `.env`.

## Contas de demonstração

| Perfil            | E-mail                 | Senha         |
| ----------------- | ---------------------- | ------------- |
| Equipe da clínica | `mariana@benevita.dev` | `equipe123`   |
| Equipe da clínica | `lucas@benevita.dev`   | `equipe123`   |
| Paciente          | `ana@benevita.dev`     | `paciente123` |
| Paciente          | `bruno@benevita.dev`   | `paciente123` |
| Paciente          | `carla@benevita.dev`   | `paciente123` |

As contas da equipe têm as mesmas permissões; cada laudo registra quem o criou e quem o publicou (a tela do laudo mostra "Publicado em … por …").

## Testes

```bash
npm test         # backend + frontend
npm run check    # formatação + lint + tipos + testes
```

Os testes do backend são de integração contra um **PostgreSQL real**, num banco separado (`benevita_test`, criado e migrado automaticamente). O Docker precisa estar no ar (`npm run db:up`).

| Cenário obrigatório                                                   | Teste                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| T1. Duas tentativas simultâneas no mesmo horário: apenas uma é aceita | `appointments.routes.test.ts` · _accepts only one of two simultaneous_ |
| T2. Paciente consulta laudo de outro paciente: acesso negado          | `patient-portal.routes.test.ts` · _denies access to another patient's_ |
| T3. Paciente acessa um rascunho: conteúdo não disponibilizado         | `patient-portal.routes.test.ts` · _does not disclose the content_      |
| T4. Laudo publicado passa a estar disponível para o paciente correto  | `patient-portal.routes.test.ts` · _makes a report available_           |
| T5. Tentativa de agendar no passado é rejeitada                       | `appointments.routes.test.ts` · _rejects booking in the past_          |

## Fuso horário

O banco armazena os instantes em **UTC** e a API troca datas em ISO 8601 UTC. A clínica opera e a interface exibe sempre no **horário de Brasília (`America/Sao_Paulo`)**, independente do fuso do navegador ou do servidor.

## Decisões técnicas

- **Stack:** React 19 + Vite + TanStack Query + shadcn/ui no frontend; Fastify 5 + Zod no backend; PostgreSQL 17 + Prisma 7; Vitest. Monorepo com npm workspaces.
- **Regras críticas garantidas pelo banco**, para resistir a requisições simultâneas:
  - um agendamento ativo por horário: índice único **parcial** em `scheduled_at WHERE status = 'SCHEDULED'` (libera o horário de um cancelado);
  - horários alinhados em :00/:30: `CHECK`;
  - um laudo por agendamento: `UNIQUE`;
  - laudo publicado sempre com data e autor da publicação: `CHECK`;
  - cancelar e publicar ao mesmo tempo: as operações travam a linha do agendamento (`SELECT ... FOR UPDATE`) dentro de uma transação.
- **Autorização no backend:** cada rota exige perfil. As rotas do paciente usam só o `patientId` do token, filtrando dentro da própria consulta, e respondem o mesmo `404` para laudo de outro paciente, rascunho ou inexistente.
- **Horário comercial:** segunda a sexta, das 08:00 às 18:00 (último horário às 17:30), em horários de 30 minutos numa sala única.
- **Publicação só depois do horário do exame:** o rascunho pode ser preparado antes, mas um laudo descreve um exame já realizado.
- **Cadastros:** pacientes, tipos de exame e profissionais podem ser cadastrados em modais dentro do agendamento e do laudo. O paciente cadastrado recebe login (e-mail e senha inicial). O CRM é informado como número + UF e gravado num formato único (`CRM-SP 123456`).
- **IDs UUID v7:** ordenados no tempo (inserções sequenciais no índice) e seguros para expor na URL.
- **Autenticação:** JWT no header `Authorization`, com o mesmo erro e o mesmo custo de bcrypt para e-mail inexistente e senha errada.

## Limitações e pendências

**Limitações atuais**

- Token JWT no `localStorage`, sem renovação nem limite de tentativas de login.
- Listagem de agendamentos sem paginação.
- Sem status "realizado" nem reagendamento; cadastros sem edição ou desativação.

**Próximos passos**

_Segurança e conformidade_

- **SSO** (OIDC/SAML) para a equipe e **MFA** (TOTP ou WebAuthn).
- Sessão em cookie `httpOnly` com refresh token rotativo, revogação de sessões e rate limiting no login.
- **LGPD:** dados de saúde são dados sensíveis. Trilha de auditoria de acesso aos laudos (quem abriu e quando), política de retenção e anonimização, e exportação dos dados do paciente.
- Perfis mais granulares: recepção agenda, médico escreve e publica o laudo.
- Primeiro acesso do paciente por convite (link para criar a própria senha) em vez de senha inicial.

_Produto_

- **PDF do laudo** com QR code de verificação e **assinatura digital ICP-Brasil** (certificado A1/A3).
- **Anexos e imagens** em armazenamento de objetos com URL assinada e integração com PACS/DICOM.
- Agenda mais completa: status "realizado" e "não compareceu", reagendamento, várias salas, duração por tipo de exame, feriados e bloqueios.
- Notificações por e-mail ou WhatsApp: lembrete do exame e aviso de laudo publicado.
- Interoperabilidade com outros sistemas de saúde via **HL7 FHIR**.

_Engenharia_

- **Paginação no backend** por cursor (o UUID v7 já é ordenado no tempo) e filtros por período e status.
- CI/CD rodando `npm run check` e testes ponta a ponta com Playwright.
- Documentação OpenAPI gerada dos schemas Zod que já validam as rotas.
- Observabilidade: logs estruturados, métricas e tracing (OpenTelemetry).

## Tempo dedicado

Aproximadamente **12 horas**.
