import { GoogleGenAI } from "@google/genai";

// --- Autenticação da rota de IA ---
// Só usuários logados E aprovados podem chamar a IA (antes a rota era aberta e
// qualquer pessoa na internet podia gastar a chave do Gemini).
// Sem firebase-admin/conta de serviço: lemos o próprio perfil do usuário na API
// REST do Firestore usando o token dele. O Firestore valida o token (assinatura,
// validade, projeto) e as regras de segurança — se o token for falso, a leitura falha.
// projectId e databaseId não são segredos (já vão no JavaScript do navegador).
// Valores padrão = projeto atual (o mesmo de firebase-applet-config.json).
// Se o projeto mudar de novo, atualize os dois lugares ou defina as variáveis na Vercel.
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'setorizaapp';
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || '(default)';

export interface ResultadoAutenticacao {
  ok: boolean;
  status: number; // 200 quando ok
  error?: string;
  uid?: string;
  role?: string;
}

function lerUidDoToken(idToken: string): string | null {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const uid = json.user_id || json.sub;
    return typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : null;
  } catch {
    return null;
  }
}

export async function verificarUsuarioAprovado(authorizationHeader: unknown): Promise<ResultadoAutenticacao> {
  const header = typeof authorizationHeader === 'string' ? authorizationHeader : '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!idToken) {
    return { ok: false, status: 401, error: 'É preciso estar logado para usar a edição com IA.' };
  }
  const uid = lerUidDoToken(idToken);
  if (!uid) {
    return { ok: false, status: 401, error: 'Sessão inválida. Saia e entre novamente.' };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}` +
    `/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/users/${encodeURIComponent(uid)}`;
  let resposta: Response;
  try {
    resposta = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  } catch (err) {
    console.error('Falha ao verificar usuário no Firestore:', err);
    return { ok: false, status: 503, error: 'Não foi possível verificar seu acesso agora. Tente de novo.' };
  }
  if (resposta.status === 401 || resposta.status === 403 || resposta.status === 404) {
    return { ok: false, status: 401, error: 'Sessão inválida ou expirada. Saia e entre novamente.' };
  }
  if (!resposta.ok) {
    console.error('Firestore respondeu', resposta.status, 'ao verificar usuário.');
    return { ok: false, status: 503, error: 'Não foi possível verificar seu acesso agora. Tente de novo.' };
  }
  const perfil: any = await resposta.json().catch(() => null);
  const approved = perfil?.fields?.approved?.booleanValue === true;
  const role = perfil?.fields?.role?.stringValue || '';
  if (!approved) {
    return { ok: false, status: 403, error: 'Seu acesso ainda não foi aprovado pelo administrador.' };
  }
  return { ok: true, status: 200, uid, role };
}

// --- Edição em massa com IA ---
// Única versão das instruções e da chamada ao Gemini: usada pela Vercel (handler
// abaixo) e pelo servidor local (server.ts). Antes havia duas cópias diferentes,
// e o teste local se comportava diferente da produção.

// Campos que a IA pode alterar. Mesma lista de src/utils/edicaoIA.ts (o
// navegador valida de novo os valores antes de mostrar a prévia).
const CAMPOS_PERMITIDOS = [
  'tipoCadastro', 'subtipoCadastro', 'statusAtual', 'idade', 'tempoMembro',
  'setor2', 'am', 'af2', 'celularPrincipal', 'dataOutorga', 'anoOutorga',
  'jornadaEtapa', 'cursoIniciacao', 'cursoPosOutorga',
];

const MAX_PROMPT = 2000;

function dataISO(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  const t = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : '';
}

function aulasConcluidas(curso: any): number[] {
  const aulas = curso?.aulas || {};
  return [1, 2, 3, 4, 5].filter((n) => {
    const v = String(aulas[n] ?? aulas[String(n)] ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return v === 'concluido';
  });
}

/**
 * Monta o resumo enviado ao Gemini. Celular e endereço (dados pessoais) só vão
 * quando o pedido fala deles; antes iam sempre, em toda edição.
 */
export function resumirPessoas(people: any[], prompt: string) {
  const falaDeContato = /celular|telefone|whats|n[uú]mero|contato/i.test(prompt);
  const falaDeEndereco = /endere[cç]|bairro|\brua\b|mora|resid|cidade|avenida|\bav\./i.test(prompt);
  return people.map((p: any) => {
    const dataOutorga = dataISO(p.dataOutorga);
    const anoNum = Number(String(p.anoOutorga ?? '').match(/\d{4}/)?.[0]);
    return {
      id: String(p.id),
      nome: p.nome,
      tipoCadastro: p.tipoCadastro,
      subtipoCadastro: p.subtipoCadastro,
      statusAtual: p.statusAtual,
      setor2: p.setor2,
      am: p.am,
      af2: p.af2,
      idade: p.idade,
      tempoMembro: p.tempoMembro,
      jornadaEtapa: p.jornadaEtapa,
      dataOutorga,
      anoOutorga: anoNum || (dataOutorga ? Number(dataOutorga.slice(0, 4)) : null),
      posOutorgaAulasConcluidas: aulasConcluidas(p.cursoPosOutorga),
      iniciacaoAulasConcluidas: aulasConcluidas(p.cursoIniciacao),
      ...(falaDeContato ? { celularPrincipal: p.celularPrincipal } : {}),
      ...(falaDeEndereco ? { endCompleto: p.endCompleto } : {}),
    };
  });
}

const SYSTEM_INSTRUCTION = `Você é o assistente de edição em massa do app de gestão do Johrei Center.
Recebe um pedido em português e a lista de pessoas (peopleSummary). Identifique QUAIS pessoas o pedido atinge e QUAIS campos mudam.

Campos que você pode alterar (nenhum outro):
- 'tipoCadastro' (ex: 'Ohikari', 'Frequente', 'Primeiro Contato')
- 'subtipoCadastro': 'MEMBRO' ou 'FREQUENTADOR'
- 'statusAtual': 'ATIVO', 'INATIVO', 'AFASTADO' ou 'FALECIDO'
- 'idade' (número inteiro)
- 'tempoMembro' (texto, ex: '5 anos')
- 'setor2' (texto em maiúsculas, ex: 'SUL', 'CENTRO-NORTE', 'LESTE')
- 'am' (nome do Assistente de Ministro), 'af2' (nome do Assistente de Família)
- 'celularPrincipal' (texto)
- 'dataOutorga' (formato 'AAAA-MM-DD'), 'anoOutorga' (número)
- 'jornadaEtapa': exatamente uma de 'Primeiro atendimento', 'Recebe Johrei', 'Curso de Iniciação', 'Ingressa', 'Recebe Ohikari', 'Curso Pós-Outorga', 'Conclui Pós-Outorga', 'Torna-se membro ativo'
- 'cursoPosOutorga': { "aulas": { "1": "Concluído" | "Não iniciou", ... } } — inclua só as aulas que mudam. NÃO existe "Em andamento".
- 'cursoIniciacao': { "aulas": { "1": "Concluído" | "Não iniciado", ... } } — inclua só as aulas que mudam.

No peopleSummary, as aulas aparecem como listas de aulas concluídas (posOutorgaAulasConcluidas, iniciacaoAulasConcluidas).

REGRAS:
1. Retorne apenas as pessoas que precisam mudar, com apenas os campos que mudam. Se ninguém se encaixar, 'updates' vazio.
2. Nunca altere nem invente 'id'. Use exatamente o 'id' recebido.
3. Datas: 'dataOutorga' vem em 'AAAA-MM-DD' e 'anoOutorga' como número. Converta datas do pedido ('DD/MM/AAAA') para 'AAAA-MM-DD' antes de comparar.
   Respeite exatamente a direção do pedido: "antes de 2020" = ano < 2020; "a partir de 2020" = ano >= 2020; "depois de 2020" = ano > 2020.
   Pessoa sem data/ano de outorga NÃO entra em filtros por outorga.
4. Se o pedido for ambíguo ou perigoso (ex.: alterar todo mundo sem critério claro), retorne success=false e explique em 'explanation' o que precisa ser esclarecido.
5. Responda em JSON com:
   - 'success': boolean
   - 'explanation': uma frase simples em português dizendo o que será alterado e em quantas pessoas
   - 'updates': lista de { "id": string, "updates": objeto com os campos }`;

export interface ResultadoEdicao {
  status: number;
  body: any;
}

/** Valida o pedido, chama o Gemini e filtra a resposta. */
export async function processarEdicaoEmMassa(body: any): Promise<ResultadoEdicao> {
  const { prompt, people, viewContext } = body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || !Array.isArray(people)) {
    return { status: 400, body: { error: "Faltam parâmetros obrigatórios: 'prompt' e 'people'" } };
  }
  if (prompt.length > MAX_PROMPT) {
    return { status: 400, body: { error: `O comando é longo demais (máximo de ${MAX_PROMPT} caracteres).` } };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: "GEMINI_API_KEY não está configurada no servidor (na Vercel: Settings → Environment Variables)." } };
  }

  const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ text: JSON.stringify({ prompt, viewContext, peopleSummary: resumirPessoas(people, prompt) }) }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          success: { type: "BOOLEAN" },
          explanation: { type: "STRING" },
          updates: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                updates: { type: "OBJECT", description: "Campos a alterar nesta pessoa." }
              },
              required: ["id", "updates"]
            }
          }
        },
        required: ["success", "explanation", "updates"]
      }
    }
  });

  let resultado: any;
  try {
    resultado = JSON.parse(response.text || '{}');
  } catch {
    return { status: 502, body: { error: 'A IA devolveu uma resposta inválida. Tente reformular o pedido.' } };
  }
  return { status: 200, body: filtrarResposta(resultado, people) };
}

/** Só pessoas que existem no pedido e só campos permitidos. */
export function filtrarResposta(resultado: any, people: any[]) {
  const idsValidos = new Set(people.map((p: any) => String(p.id)));
  const vistos = new Set<string>();
  const updates = (Array.isArray(resultado?.updates) ? resultado.updates : [])
    .filter((u: any) => u && idsValidos.has(String(u.id)) && !vistos.has(String(u.id)) && vistos.add(String(u.id)))
    .map((u: any) => {
      const campos: Record<string, unknown> = {};
      Object.entries(u.updates || {}).forEach(([k, v]) => {
        const raiz = k.split(/[.[]/)[0];
        if (CAMPOS_PERMITIDOS.includes(raiz)) campos[k] = v;
      });
      return { id: String(u.id), updates: campos };
    })
    .filter((u: any) => Object.keys(u.updates).length > 0);
  return {
    success: resultado?.success === true,
    explanation: typeof resultado?.explanation === 'string' ? resultado.explanation : '',
    updates,
  };
}

export default async function handler(req: any, res: any) {
  // Sem cabeçalhos CORS: o app chama esta rota do mesmo domínio.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const autenticacao = await verificarUsuarioAprovado(req.headers?.authorization);
    if (!autenticacao.ok) {
      return res.status(autenticacao.status).json({ error: autenticacao.error });
    }
    const { status, body } = await processarEdicaoEmMassa(req.body);
    return res.status(status).json(body);
  } catch (error: any) {
    console.error("AI Bulk Edit Vercel Error:", error);
    return res.status(500).json({ error: error.message || "Falha ao processar edição inteligente." });
  }
}
