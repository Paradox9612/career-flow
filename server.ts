import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getAiStatus,
  handleAnalyzeJd,
  handleAnalyzeResume,
  handleCoverLetter,
  handleInterviewQuestions,
  handleMatchResumeToJob,
} from './server/aiHandlers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/ai/status', (_req: Request, res: Response) => {
    const result = getAiStatus();
    res.status(result.status).json(result.data);
  });

  app.post('/api/ai/analyze-resume', async (req: Request, res: Response) => {
    const result = await handleAnalyzeResume(req.body);
    res.status(result.status).json(result.data);
  });

  app.post('/api/ai/analyze-jd', async (req: Request, res: Response) => {
    const result = await handleAnalyzeJd(req.body);
    res.status(result.status).json(result.data);
  });

  app.post('/api/ai/match', async (req: Request, res: Response) => {
    const result = await handleMatchResumeToJob(req.body);
    res.status(result.status).json(result.data);
  });

  app.post('/api/ai/cover-letter', async (req: Request, res: Response) => {
    const result = await handleCoverLetter(req.body);
    res.status(result.status).json(result.data);
  });

  app.post('/api/ai/interview-questions', async (req: Request, res: Response) => {
    const result = await handleInterviewQuestions(req.body);
    res.status(result.status).json(result.data);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareerFlow server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CareerFlow server:', err);
  process.exit(1);
});
