import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON request bodies with generous limits for bulk operations
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API endpoint for Gemini bulk edits
  app.post("/api/ai/bulk-edit", async (req, res) => {
    try {
      const { prompt, people, viewContext } = req.body;
      if (!prompt || !people) {
        return res.status(400).json({ error: "Faltam parâmetros obrigatórios: 'prompt' e 'people'" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY não está configurada no servidor. Por favor, adicione a chave de API nas configurações de segredos." 
        });
      }

      // Initialize Gemini Client
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare a highly specific instruction for our church database edits
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
1. Retorne apenas os registros que precisarem de alteração. Se nenhum registro corresponder aos filtros do usuário, retorne um array vazio de updates e coloque na 'explanation' que nenhuma pessoa correspondeu aos critérios.
2. Não altere o 'id' das pessoas de forma alguma. O 'id' deve ser preservado exatamente como recebido (seja número ou string) para mapearmos corretamente de volta.
3. ATENÇÃO CRÍTICA A DATAS E COMPARAÇÕES:
   - No banco de dados recebido, o campo 'dataOutorga' está no formato ISO 'YYYY-MM-DD' (ex: "2015-04-18" ou "2026-06-25").
   - O usuário pode expressar datas no formato brasileiro/português 'DD/MM/YYYY' (ex: "01/01/2026") ou anos como "2026".
   - Para comparar uma data (ex: "2015-04-18") com o critério do usuário (ex: "01/01/2026"):
     a. Primeiro, converta o critério do usuário para o formato ISO 'YYYY-MM-DD' (ex: "01/01/2026" vira "2026-01-01").
     b. Depois, faça a comparação estrita (ex: "2015-04-18" > "2026-01-01" é FALSE, pois o ano 2015 é ANTERIOR ao ano 2026).
     c. NUNCA compare uma string ISO-8601 (YYYY-MM-DD) diretamente com uma string no formato brasileiro (DD/MM/YYYY). Isso causará falsos positivos graves, como confundir 2015 como posterior a 2026!
     d. Seja extremamente preciso. Se o usuário pedir "pessoas com outorga depois de 01/01/2026" e apenas 1 ou 2 pessoas tiverem a data posterior a "2026-01-01", retorne APENAS essas pessoas em 'updates'. Nunca retorne dezenas ou centenas de pessoas por engano.
   - Se nenhuma pessoa corresponder aos critérios de data filtrados, retorne 'updates' como um array vazio [] e relate isso de forma simpática no campo 'explanation'.
4. Retorne um JSON válido com três propriedades:
   - 'success': boolean indicando se a IA entendeu e conseguiu processar com sucesso.
   - 'explanation': uma frase em português explicando de forma simples, humilde e simpática o que foi alterado e em quantas pessoas. (Ex: "Atualizei as aulas de 4 membros que foram outorgados após 2024 para Não iniciado.")
   - 'updates': array contendo objetos com '{ id: string, updates: object }' onde 'updates' possui apenas os campos a serem mesclados no registro original.`;

      // Generate content with Gemini
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
            type: Type.OBJECT,
            properties: {
              success: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING },
              updates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    updates: {
                      type: Type.OBJECT,
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
      res.json(JSON.parse(text));

    } catch (error: any) {
      console.error("AI Bulk Edit Endpoint Error:", error);
      res.status(500).json({ error: error.message || "Falha ao processar edição inteligente." });
    }
  });

  // Vite middleware setup for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
