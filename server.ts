import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { apiRouter } from './src/server/api.ts';
import { registerBiometricRoutes } from './src/server/biometric.ts';

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  const server = http.createServer(app);

  // In production (Cloud Run), Cloud Run assigns the listening port via process.env.PORT (typically 8080).
  // In local development, the server must listen on port 3000 (proxied by NGINX / preview iframe).
  const PORT = process.env.NODE_ENV === 'production'
    ? (Number(process.env.PORT) || 3000)
    : (Number(process.env.DEFAULT_APP_PORT) || 3000);

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  // Root health check endpoint for Cloud Run container probes
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // Ensure upload directory exists and serve static uploads
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // API routes FIRST
  app.use('/api', apiRouter);
  registerBiometricRoutes(app);

  // Vite middleware for development, static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtml = path.join(distPath, 'index.html');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (req, res) => {
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(200).send('<!doctype html><html><body><div id="root">Nexus Academy Loading...</div></body></html>');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'production'})`);
  });
}

startServer();
