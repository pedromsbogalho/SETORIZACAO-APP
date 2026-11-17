import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { verificarUsuarioAprovado, processarEdicaoEmMassa } from "./api/ai/bulk-edit";

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
  // Edição em massa com IA: mesma lógica da Vercel (api/ai/bulk-edit.ts).
  app.post("/api/ai/bulk-edit", async (req, res) => {
    try {
      const autenticacao = await verificarUsuarioAprovado(req.headers.authorization);
      if (!autenticacao.ok) {
        return res.status(autenticacao.status).json({ error: autenticacao.error });
      }
      const { status, body } = await processarEdicaoEmMassa(req.body);
      res.status(status).json(body);
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
