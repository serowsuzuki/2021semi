import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWordsRouter } from './routes/words.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(here, '../../web/dist');

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, ai_configured: Boolean(process.env.ANTHROPIC_API_KEY) });
  });
  app.use('/api/words', createWordsRouter(db));

  // ビルド済みフロントエンドがあれば同一オリジンで配信する(PWA用)
  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.join(WEB_DIST, 'index.html'));
    });
  }

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'エンドポイントが見つかりません' });
  });

  // エラーハンドラ: 保存失敗などは必ずメッセージ付きでフロントに返す(非機能要件: データ永続化)
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status ?? 500;
    // 設定不足などの想定内の5xxは1行、それ以外はスタックトレースを出す
    if (status === 500) console.error(err);
    else if (status > 500) console.warn(`[${status}] ${err.message}`);
    res.status(status).json({ error: err.message ?? '予期しないエラーが発生しました' });
  });

  return app;
}
