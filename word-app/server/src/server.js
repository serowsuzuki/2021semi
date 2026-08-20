import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { openDatabase } from './db/index.js';
import { createApp } from './app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// .env は word-app/ 直下、または server/ 直下のどちらに置いても読み込む
dotenv.config({
  path: [path.resolve(here, '../../.env'), path.resolve(here, '../.env')],
  quiet: true,
});

const port = Number(process.env.PORT ?? 3001);
const db = openDatabase();
const app = createApp(db);

const server = app.listen(port, () => {
  console.log(`[word-app] server listening on http://localhost:${port}`);
  console.log(`[word-app] database: ${process.env.DB_PATH ?? 'server/data/words.db'}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[word-app] ANTHROPIC_API_KEY が未設定です。単語情報の自動生成は利用できません。');
  }
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
