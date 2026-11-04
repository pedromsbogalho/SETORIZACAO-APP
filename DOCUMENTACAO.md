# 📖 Documentação — SETORIZACAO-APP

> **Gestão de Johrei Center** — CRM religioso e gestão de membros, frequentadores, setores e jornada espiritual para a **Igreja Messiânica Mundial do Brasil**.

---

## 1. Visão Geral

O SETORIZACAO-APP é uma aplicação web full-stack criada a partir de um applet do **Google AI Studio**, com o objetivo de centralizar a gestão do Johrei Center:

- Cadastro de **membros, frequentadores e primeiros contatos** (pessoas);
- Controle da **jornada espiritual** (outorga, cursos, purificações, orientações, donativos, etc.);
- Gestão da **estrutura do centro** (setores, AMs — Assistentes de Ministro, AFs — Assistentes de Família, assessores);
- Gestão de **famílias** com mapa do Google Maps;
- **Importação de planilhas** (CSV);
- **Editor em massa com Inteligência Artificial** (Gemini);
- **Autenticação e controle de acesso** (aprovação de usuários e papéis);
- **Logs de auditoria** de todas as alterações;
- Relatórios, dashboard, aniversariantes, pendências e árvore hierárquica.

### Informações do app (metadata.json)
| Campo | Valor |
|---|---|
| Nome | Gestão de Johrei Center |
| Descrição | CRM Religioso e gestão de membros, frequentadores, setores e jornada espiritual |
| Capacidade principal | Server-side Gemini API |
| App AI Studio | https://ai.studio/apps/0703a7bd-0c96-4411-94f0-747479362cad |

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | **React 19** + **TypeScript 5.8** |
| Build / Dev server | **Vite 6** (com `@vitejs/plugin-react`) |
| Estilização | **Tailwind CSS 4** (via `@tailwindcss/vite`) |
| Ícones | `lucide-react` |
| Animações | `motion` |
| Backend / servidor | **Express 4** (`server.ts`, executado com `tsx` em dev) |
| Banco de dados | **Firebase Firestore** (SDK `firebase` v12) |
| Inteligência Artificial | **Google Gemini** (`@google/genai`) — modelo `gemini-3.5-flash` |
| Mapas | `@vis.gl/react-google-maps` (Google Maps Platform) |
| Deploy | **Vercel** (rewrites em `vercel.json`) + build Node (`dist/server.cjs`) |

---

## 3. Estrutura de Diretórios

```
SETORIZACAO-APP/
├── api/
│   └── ai/
│       └── bulk-edit.ts        # Endpoint serverless (Vercel) para edição em massa via IA
├── assets/                     # Recursos estáticos
├── public/
│   └── faviconimmb.png         # Favicon
├── src/
│   ├── App.tsx                 # Componente raiz (~1700 linhas): estado global, navegação, estrutura padrão
│   ├── main.tsx                # Ponto de entrada React
│   ├── index.css               # Estilos globais (Tailwind)
│   ├── types.ts                # Tipos de domínio (Pessoa, Jornada, Estrutura, etc.)
│   ├── demoData.ts             # Dados de demonstração
│   ├── utils/
│   │   ├── firebase.ts         # Inicialização do Firebase (Auth + Firestore)
│   │   └── csvParser.ts        # Parser de importação de planilhas CSV
│   └── components/             # Telas da aplicação (ver seção 5)
├── dist/                       # Build de produção (gerado)
├── firestore.rules             # Regras de segurança do Firestore
├── firebase-applet-config.json # Config do Firebase (ambiente AI Studio)
├── firebase-blueprint.json     # Blueprint da estrutura do Firebase
├── vercel.json                 # Configuração de deploy na Vercel
├── vite.config.ts              # Configuração do Vite
├── tsconfig.json               # Configuração TypeScript
├── server.ts                   # Servidor Express (dev + produção, API do Gemini)
├── .env.example                # Exemplo de variáveis de ambiente
├── ANOTACOES.txt               # Notas do usuário (cotas Firebase, ideias futuras)
├── TODO.md                     # Checklist de tarefas
└── package.json
```

---

## 4. Scripts do Projeto (`package.json`)

| Comando | Ação |
|---|---|
| `npm run dev` | Inicia o servidor Express com middleware do Vite (`tsx server.ts`) — porta **3000** |
| `npm run build` | `vite build` + bundle do servidor com esbuild → `dist/server.cjs` |
| `npm start` | Roda o build de produção (`node dist/server.cjs`) |
| `npm run preview` | Preview do build do Vite |
| `npm run clean` | Remove `dist/` e `server.js` |
| `npm run lint` | `tsc --noEmit` (verificação de tipos) |

---

## 5. Telas / Componentes

Todos em `src/components/`:

| Componente | Função |
|---|---|
| `AuthView.tsx` | Login / autenticação e registro |
| `UserApprovalsView.tsx` | Controle de acesso — aprovação de novos usuários |
| `DashboardView.tsx` | Painel geral com indicadores |
| `PeopleView.tsx` | Cadastro e listagem de pessoas (membros/frequentadores) |
| `FrequentersView.tsx` | Gestão de frequentadores |
| `FamiliesView.tsx` | Gestão de famílias |
| `FamilyGoogleMap.tsx` | Mapa das famílias (Google Maps) |
| `StructureView.tsx` | Estrutura JC — setores, AMs, AFs e assessores |
| `TreeView.tsx` | Visualização hierárquica (árvore de setores/pessoas) |
| `JourneyView.tsx` | Jornada espiritual dos membros |
| `CoursesView.tsx` | Cursos (Iniciação, Pós-Outorga, níveis da igreja) |
| `BirthdaysView.tsx` | Aniversariantes |
| `PendenciesView.tsx` | Pendências |
| `ReportsView.tsx` | Relatórios |
| `ActionLogsView.tsx` | Logs de auditoria |
| `AIBulkEditor.tsx` | Edição em massa de registros via prompt em linguagem natural (Gemini) |

### Navegação principal (`App.tsx`)
O `App.tsx` concentra o **estado global** (pessoas, estrutura, famílias, usuário) e garante que alterações feitas em uma tela reflitam em todas as outras (sincronização entre `structure` e `people`). Itens de navegação extras para admins: **Controle de Acesso** e **Logs de Auditoria**.

---

## 6. Modelo de Dados (`src/types.ts`)

Principais tipos:

- **`TipoCadastro`** — `'Ohikari' | 'Frequente' | 'Primeiro Contato' | 'Membro'`
- **`SubtipoCadastro`** — `'MEMBRO' | 'FREQUENTADOR'`
- **`StatusAtual`** — `'ATIVO' | 'INATIVO' | 'AFASTADO' | 'FALECIDO'`
- **`JornadaEtapa`** — etapas da caminhada espiritual (ex.: Primeiro atendimento, Recebe Johrei, Curso de Iniciação, Ingressa, Recebe Ohikari, Curso Pós-Outorga, etc.)
- **`CursoIniciacao`** — concluído, data, instrutor, presença
- **`CursoPosOutorga`** — aulas 1–5 com status `'Não iniciou' | 'Em andamento' | 'Concluído'`, datas de conclusão, instrutores e comentários
- **`CursosNivelIgreja`** — níveis 1 a 4 da igreja
- **`PurificacoesMembro`** — saúde, conflito, financeiro, outros + comentários
- **`OrientaesMembro`** — texto + cumprindo (`Sim | Parcialmente | Não | Não se aplica`) + comentários
- **`JornadaMembro`** — donativo, frequência de Johrei, quantidade de encaminhados, ikebana, participação JOVEM3, purificações, orientações e cursos de nível
- **`GrupoWhatsApp`** — participação nos grupos geral, do lar e do setor
- **`ComentarioJornada`** — comentários com autor, e-mail, uid e timestamp

### Estrutura do Johrei Center (`App.tsx` → `DEFAULT_STRUCTURE`)
- **`amList`** — Assistentes de Ministro por setor (ex.: Daniela Almeida — CENTRO-NORTE, Graziela Paiva — SUL, Min Clelia — ILHA BELA / SÃO SEBASTIÃO, Anna Julia — INDAIÁ-SERRA)
- **`afList`** — Assistentes de Família por setor (YOKO, PAULO, MARTA, CARLOS)
- **`assessoresList`** — Assessores com papel (ex.: MÁRIO TANAKA — Assessor de Iniciação)

### Setores em uso
`SUL`, `CENTRO-NORTE`, `LESTE`, `ILHA BELA`, `INDAIÁ-SERRA`, `SÃO SEBASTIÃO`

---

## 7. Backend e API

### `server.ts` (Express, porta 3000)
- `GET /api/health` — health check (`{ status: "ok" }`)
- `POST /api/ai/bulk-edit` — edição em massa com IA:
  - Recebe `{ prompt, people, viewContext }`;
  - Valida `GEMINI_API_KEY`;
  - Chama o **Gemini** (`gemini-3.5-flash`) com instrução de sistema detalhada e **responseSchema** estrito (`success`, `explanation`, `updates[{id, updates}]`);
  - Regras críticas embutidas no prompt: preservar `id`, tratamento rigoroso de datas (ISO `YYYY-MM-DD` vs. brasileiro `DD/MM/YYYY`) e retorno apenas dos registros que precisam de alteração.
- Em **desenvolvimento**, monta o middleware do Vite; em **produção**, serve `dist/` como SPA.

### `api/ai/bulk-edit.ts`
Versão serverless do mesmo endpoint para deploy na **Vercel** (rotas `/api/*` conforme `vercel.json`).

---

## 8. Firebase e Segurança

### Coleções do Firestore
| Coleção | Conteúdo |
|---|---|
| `users` | Perfis de usuários (role, approved) |
| `people` | Pessoas (membros, frequentadores, contatos) |
| `families` | Famílias |
| `structures` | Estrutura do Johrei Center |
| `logs` | Logs de auditoria (criação por usuários aprovados, leitura só para admins) |

### Regras de segurança (`firestore.rules`)
- **Default deny** — tudo bloqueado por padrão;
- `isSignedIn()` — exige autenticação;
- `isApproved()` — usuário autenticado com `approved == true` (ou e-mail admin `pedro.ms.bogalho@gmail.com`);
- `isAdmin()` — papel `ADMIN` (ou e-mail admin fixo);
- `users`: o próprio usuário lê/escreve seu perfil; admin gerencia todos;
- `people`, `families`, `structures`: leitura/escrita **apenas para usuários aprovados**;
- `logs`: criação por aprovados, **leitura somente admin**.

### Variáveis de ambiente (`.env.example`)
- `GEMINI_API_KEY` — chamadas ao Gemini (injetada pelo AI Studio ou definida localmente);
- `APP_URL` — URL de hospedagem;
- `VITE_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, DATABASE_ID) — configuração do Firebase (pode sobrescrever `firebase-applet-config.json` em produção, ex.: Vercel);
- `GOOGLE_MAPS_PLATFORM_KEY` — mapa das famílias.

---

## 9. Limites do Firebase (plano Spark — gratuito)

Conforme anotações do projeto (`ANOTACOES.txt`):

| Operação | Cota diária | Impacto no app |
|---|---|---|
| Leituras | 50.000/dia | Cada carregamento de tela conta 1 leitura por documento. Com ~500 membros, dá para ~100 recarregamentos/dia. Cache do navegador ajuda a economizar. |
| Gravações | 20.000/dia | Cada edição manual gera **2 gravações** (1 no membro + 1 no log de auditoria). Importar planilha com 300 alterações = ~600 gravações. |
| Exclusões | 20.000/dia | Raro no dia a dia; dificilmente atingível. |

**Recomendação:** consolidar importações de planilha (1–2x por semana) em vez de subir a planilha a cada pequena alteração.

---

## 10. Deploy

### Vercel (`vercel.json`)
- `/api/(.*)` → funções serverless (`api/`);
- Demais rotas → `index.html` (SPA fallback).

### Passos típicos
1. Configurar variáveis de ambiente na Vercel (`VITE_FIREBASE_*`, `GEMINI_API_KEY`, `GOOGLE_MAPS_PLATFORM_KEY`);
2. `npm run build`;
3. Deploy (a função serverless cuida da IA; o Express compilado serve como alternativa de hospedagem própria).

---

## 11. Status do Desenvolvimento (`TODO.md`)

Concluído:
- ✅ Remoção da opção de tema (dark/light);
- ✅ Sincronização de alterações entre todas as telas;
- ✅ Edição da Estrutura JC (responsável de setor/AM) reflete na lista de membros e relatórios;
- ✅ Exclusão de um AM da Estrutura JC propaga impacto nos membros relacionados.

Pendente:
- ⬜ Validar com `npm run build` / `npm run lint`;
- ⬜ Resumo da jornada espiritual na tela de pós-outorga;
- ⬜ Tela de "assistentes de família" (CÍNTIA);
- ⬜ Mostrar o setor no card da pessoa na lista de aniversariantes.

---

*Documentação gerada em 04/11/2026 a partir da análise do código-fonte do repositório.*
