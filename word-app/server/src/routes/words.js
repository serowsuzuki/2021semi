import { Router } from 'express';
import {
  listWords,
  getWord,
  createWord,
  updateWord,
  deleteWord,
  recordReview,
  reviewQueue,
  getStats,
} from '../repositories/words.js';
import { normalizeWordInput } from '../lib/validate.js';
import { generateWordInfo } from '../services/generate.js';
import { toJsonExport, toCsv, toAnkiCsv } from '../services/export.js';

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createWordsRouter(db) {
  const router = Router();

  // --- 統計(4.4) ---
  router.get('/stats', (req, res) => {
    res.json(getStats(db));
  });

  // --- 単語情報の自動生成(4.1)。保存はしない ---
  router.post(
    '/generate',
    asyncHandler(async (req, res) => {
      const generated = await generateWordInfo(req.body?.headword);
      res.json(generated);
    }),
  );

  // --- 復習キュー(4.3) ---
  router.get('/review/queue', (req, res) => {
    const includeAll = req.query.include_all === 'true' || req.query.include_all === '1';
    const { words, fallback } = reviewQueue(db, { includeAll });
    res.json({ words, fallback, count: words.length });
  });

  // --- エクスポート(7.4) ---
  router.get('/export', (req, res) => {
    const format = String(req.query.format ?? 'json');
    const status = req.query.status ? String(req.query.status) : null;
    const words = listWords(db, { status });
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      res.type('text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="words-${stamp}.csv"`);
      return res.send(toCsv(words));
    }
    if (format === 'anki') {
      res.type('text/tab-separated-values; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="words-anki-${stamp}.txt"`);
      return res.send(toAnkiCsv(words));
    }
    res.set('Content-Disposition', `attachment; filename="words-${stamp}.json"`);
    return res.json({ exported_at: new Date().toISOString(), words: toJsonExport(words) });
  });

  // --- 一覧(4.2) ---
  router.get('/', (req, res) => {
    const words = listWords(db, {
      due: req.query.due === 'true' || req.query.due === '1',
      status: req.query.status ? String(req.query.status) : null,
      search: req.query.q ? String(req.query.q) : null,
    });
    res.json({ words, count: words.length });
  });

  // --- 登録(4.1) ---
  router.post('/', (req, res) => {
    const input = normalizeWordInput(req.body);
    res.status(201).json(createWord(db, input));
  });

  // --- 詳細(4.2 / 履歴は 4.4) ---
  router.get('/:id', (req, res) => {
    res.json(getWord(db, req.params.id));
  });

  // --- 編集(4.2) ---
  router.put('/:id', (req, res) => {
    const input = normalizeWordInput(req.body);
    res.json(updateWord(db, req.params.id, input));
  });

  // --- 削除(4.2) ---
  router.delete('/:id', (req, res) => {
    res.json(deleteWord(db, req.params.id));
  });

  // --- 復習結果の記録(4.3) ---
  router.post('/:id/reviews', (req, res) => {
    res.json(recordReview(db, req.params.id, req.body?.result));
  });

  return router;
}
