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

function parseYearValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const matchYMD = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchYMD) return Number(matchYMD[1]);

  const matchDMY = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchDMY) return Number(matchDMY[3]);

  const matchYearOnly = text.match(/\b(19|20)\d{2}\b/);
  if (matchYearOnly) return Number(matchYearOnly[0]);

  return null;
}

function getPersonOutorgaYear(person: any): number | null {
  return parseYearValue(person?.dataOutorga) ?? parseYearValue(person?.anoOutorga) ?? null;
}

function getFallbackBulkEditUpdates(prompt: string, people: any[], viewContext?: string) {
  const normalizedPrompt = prompt.toLowerCase();
  const mentionsPostOutorga = /pós-outorga|pos-outorga|pós outorga|pos outorga|curso pós|curso pos|pós-?outorga/.test(normalizedPrompt);
  const mentionsReset = /(não iniciou|nao iniciou|sem conclus|sem conclusão|sem conclusao|resetar|reset)/.test(normalizedPrompt);
  const mentionsConcluded = /(conclu(?:í|i)da|concluida|concluído|concluido)/.test(normalizedPrompt);
  const mentionsInProgress = /(em andamento|em-andamento|andamento)/.test(normalizedPrompt);

  if (!mentionsPostOutorga || !mentionsReset) {
    return null;
  }

  const targetStatus = mentionsConcluded ? 'Concluído' : mentionsInProgress ? 'Em andamento' : 'Não iniciou';
  const requestedLessons = [1, 2, 3, 4, 5];
  const yearMatch = prompt.match(/\b(19|20)\d{2}\b/);
  const thresholdYear = yearMatch ? Number(yearMatch[0]) : null;

  const matchedPeople = people.filter((person: any) => {
    if (!mentionsPostOutorga) return false;

    if (thresholdYear !== null) {
      const personYear = getPersonOutorgaYear(person);
      if (personYear === null) return false;
      return personYear >= thresholdYear;
    }

    return true;
  });

  if (matchedPeople.length === 0) {
    return {
      success: true,
      explanation: 'Nenhum membro correspondeu aos critérios informados. Nenhuma alteração foi realizada.',
      updates: []
    };
  }

  const updates = matchedPeople.map((person: any) => {
    const aulas: Record<string, string> = {};
    requestedLessons.forEach((lessonNumber) => {
      aulas[String(lessonNumber)] = targetStatus;
    });

    return {
      id: person.id,
      updates: {
        cursoPosOutorga: {
          aulas
        }
      }
    };
  });

  const yearSuffix = thresholdYear ? ` para outorgados a partir de ${thresholdYear}` : '';
  return {
    success: true,
    explanation: `Atualizei o progresso de ${matchedPeople.length} pessoa(s) para ${targetStatus.toLowerCase()} no curso pós-outorga${yearSuffix}.`,
    updates
  };
}

export default async function handler(req: any, res: any) {
  // Sem cabeçalhos CORS: o app chama esta rota do mesmo domínio, então não é
  // preciso (e antes o "Access-Control-Allow-Origin: *" liberava qualquer site).
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const autenticacao = await verificarUsuarioAprovado(req.headers?.authorization);
    if (!autenticacao.ok) {
      return res.status(autenticacao.status).json({ error: autenticacao.error });
    }

    const { prompt, people, viewContext } = req.body;
    if (!prompt || !people) {
      return res.status(400).json({ error: "Faltam parâmetros obrigatórios: 'prompt' e 'people'" });
    }

    const fallbackResponse = getFallbackBulkEditUpdates(prompt, people, viewContext);
    if (fallbackResponse) {
      return res.status(200).json(fallbackResponse);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY não está configurada na Vercel. Por favor, adicione a variável de ambiente 'GEMINI_API_KEY' com sua chave de API nas configurações do projeto na Vercel (Settings -> Environment Variables)." 
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `Você é um Assistente Inteligente de edição em massa de dados para o aplicativo do Johrei Center.
O usuário enviará uma instrução de texto em português e a lista atualizada de membros/pessoas. Seu trabalho é processar e identificar quais registros devem sofrer alterações e quais campos devem ser alterados.

Campos que você pode alterar dependendo do pedido:
- 'tipoCadastro' (ex: 'Ohikari', 'Frequente', 'Primeiro Contato')
- 'subtipoCadastro' (ex: 'MEMBRO', 'FREQUENTADOR')
- 'statusAtual' (ex: 'ATIVO', 'INATIVO', 'AFASTADO')
- 'idade' (number)
- 'tempoMembro' (string, ex: '5 anos', '6 meses')
- 'setor2' (string, ex: 'SUL', 'CENTRO-NORTE', 'LESTE', 'ILHA BELA', 'INDAIÁ-SERRA', 'SÃO SEBASTIÃO')
- 'am' (string, nome do Assistente de Ministro)
- 'af2' (string, nome do Assistente de Família)
- 'celularPrincipal' (string, celular)
- 'dataOutorga' (string, ex: '15/05/2023')
- 'anoOutorga' (number ou string, ex: 2023)
- 'jornadaEtapa' (ex: 'Primeiro atendimento', 'Recebe Johrei', 'Curso de Iniciação', 'Ingressa', 'Recebe Ohikari', 'Curso Pós-Outorga', 'Conclui Pós-Outorga', 'Torna-se membro ativo')
- 'cursoPosOutorga': objeto contendo as aulas de 1 a 5. Exemplo de estrutura:
  "cursoPosOutorga": {
    "aulas": {
      "1": "Concluído",
      "2": "Não iniciou",
      "3": "Não iniciou",
      "4": "Não iniciou",
      "5": "Não iniciou"
    }
  }
  Valores possíveis para cada aula: 'Não iniciou', 'Em andamento', 'Concluído'.

ATENÇÃO ÀS REGRAS:
1. Retorne apenas os registros que precisarem de alteração. Se nenhum registro corresponder, retorne um array vazio de updates.
2. Não altere o 'id' das pessoas de forma alguma. O 'id' deve ser preservado exatamente como recebido para mapearmos corretamente na volta.
3. Se a solicitação pedir por exemplo "Deixe todos os membros com data de outorga superior a 2024 com a aula 1 e 2 concluída", você deve analisar a 'dataOutorga' (analisando o ano no formato DD/MM/YYYY) ou 'anoOutorga', e para os registros condizentes, atualizar cursoPosOutorga.aulas["1"] para "Concluído" e cursoPosOutorga.aulas["2"] para "Concluído".
4. Retorne um JSON válido com três propriedades:
   - 'success': boolean indicando se a IA entendeu e conseguiu processar com sucesso.
   - 'explanation': uma frase em português explicando de forma simples, humilde e simpática o que foi alterado e em quantas pessoas. (Ex: "Atualizei as aulas 1 e 2 para concluídas em 4 membros que foram outorgados após 2024.")
   - 'updates': array contendo objetos com '{ id: string, updates: object }' onde 'updates' possui apenas os campos a serem mesclados no registro original.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          text: JSON.stringify({
            prompt,
            viewContext,
            peopleSummary: people.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              tipoCadastro: p.tipoCadastro,
              subtipoCadastro: p.subtipoCadastro,
              dataOutorga: p.dataOutorga,
              anoOutorga: p.anoOutorga,
              setor2: p.setor2,
              idade: p.idade,
              tempoMembro: p.tempoMembro,
              jornadaEtapa: p.jornadaEtapa,
              cursoPosOutorga: p.cursoPosOutorga,
              am: p.am,
              af2: p.af2,
              celularPrincipal: p.celularPrincipal,
              endCompleto: p.endCompleto
            }))
          })
        }
      ],
      config: {
        systemInstruction,
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
                  updates: {
                    type: "OBJECT",
                    description: "Objeto com propriedades a serem atualizadas no registro."
                  }
                },
                required: ["id", "updates"]
              }
            }
          },
          required: ["success", "explanation", "updates"]
        }
      }
    });

    const text = response.text || "{}";
    return res.status(200).json(JSON.parse(text));

  } catch (error: any) {
    console.error("AI Bulk Edit Vercel Error:", error);
    return res.status(500).json({ error: error.message || "Falha ao processar edição inteligente." });
  }
}
