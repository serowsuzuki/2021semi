import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/index.js';
import { createApp } from '../src/app.js';
import { today, addDays } from '../src/lib/date.js';

const SAMPLE = {
  headword: 'deter',
  ipa: '/dɪˈtɜːr/ 第2音節強勢',
  core_image: '相手の意思をくじいて行動を思いとどまらせる',
  meanings: [
    { meaning_ja: '抑止する', usage_context: '安全保障・防衛の文脈', common_phrase: 'deter aggression' },
  ],
  derivatives: [{ form_type: '名詞形', derivative_text: 'deterrence' }],
  example_sentences: [
    { category: 'business', sentence_en: 'The system is designed to deter incursions.', sentence_ja: 'このシステムは侵入を抑止するために設計されています。' },
    { category: 'daily_tech', sentence_en: 'A bright lamp deters bears at the campsite.', sentence_ja: '明るいランプはキャンプ場でクマを寄せ付けません。' },
  ],
  usage_distinctions: [{ synonym: 'prevent', distinction_note: 'preventは物理的阻止、deterは意思をくじく' }],
};

/** テスト用サーバーを起動し、fetchラッパーを返す。 */
async function startServer() {
  const db = openDatabase(':memory:');
  const server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const isJson = (res.headers.get('content-type') ?? '').includes('json');
    return { status: res.status, body: isJson ? JSON.parse(text) : text };
  };

  return {
    call,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
  };
}

test('単語のCRUDと復習フロー', async (t) => {
  const api = await startServer();
  t.after(() => api.close());

  // 登録
  const created = await api.call('POST', '/api/words', SAMPLE);
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(created.body.headword, 'deter');
  assert.equal(created.body.status, 'new');
  assert.equal(created.body.meanings.length, 1);
  assert.equal(created.body.example_sentences.length, 2);
  assert.equal(created.body.next_review_date, today());

  // 重複登録は409
  const duplicate = await api.call('POST', '/api/words', { ...SAMPLE, headword: 'DETER' });
  assert.equal(duplicate.status, 409);

  // 一覧・詳細
  const list = await api.call('GET', '/api/words');
  assert.equal(list.body.count, 1);
  const detail = await api.call('GET', `/api/words/${id}`);
  assert.equal(detail.body.review_history.length, 0);

  // 編集(子テーブルは全置換)
  const edited = await api.call('PUT', `/api/words/${id}`, {
    ...SAMPLE,
    core_image: '編集後のコアイメージ',
    meanings: [
      { meaning_ja: '抑止する', usage_context: '安全保障', common_phrase: 'deter aggression' },
      { meaning_ja: '思いとどまらせる', usage_context: '日常', common_phrase: 'deter someone from' },
    ],
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.core_image, '編集後のコアイメージ');
  assert.equal(edited.body.meanings.length, 2);
  assert.notEqual(edited.body.updated_at, edited.body.created_at);

  // 上限超過は400
  const tooMany = await api.call('PUT', `/api/words/${id}`, {
    ...SAMPLE,
    meanings: [SAMPLE.meanings[0], SAMPLE.meanings[0], SAMPLE.meanings[0]],
  });
  assert.equal(tooMany.status, 400);

  // 復習キュー(登録直後は対象)
  const queue = await api.call('GET', '/api/words/review/queue');
  assert.equal(queue.body.count, 1);
  assert.equal(queue.body.fallback, false);

  // 正答 → 翌日が次回復習日、履歴が1件
  const reviewed = await api.call('POST', `/api/words/${id}/reviews`, { result: 'correct' });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.interval_days, 1);
  assert.equal(reviewed.body.status, 'learning');
  assert.equal(reviewed.body.next_review_date, addDays(today(), 1));
  assert.equal(reviewed.body.review_history.length, 1);
  assert.equal(reviewed.body.review_history[0].result, 'correct');

  // 対象0件 + include_all で全単語にフォールバック
  const empty = await api.call('GET', '/api/words/review/queue');
  assert.equal(empty.body.count, 0);
  const fallback = await api.call('GET', '/api/words/review/queue?include_all=true');
  assert.equal(fallback.body.count, 1);
  assert.equal(fallback.body.fallback, true);

  // 誤答 → 当日中に再度対象
  const failed = await api.call('POST', `/api/words/${id}/reviews`, { result: 'incorrect' });
  assert.equal(failed.body.interval_days, 0);
  assert.equal(failed.body.next_review_date, today());
  assert.equal(failed.body.review_history.length, 2);

  // 不正な結果値は400
  assert.equal((await api.call('POST', `/api/words/${id}/reviews`, { result: 'maybe' })).status, 400);

  // 統計
  const stats = await api.call('GET', '/api/words/stats');
  assert.equal(stats.body.total, 1);
  assert.equal(stats.body.due, 1);
  assert.equal(stats.body.learning, 1);
  assert.equal(stats.body.reviews_today, 2);

  // エクスポート
  const json = await api.call('GET', '/api/words/export?format=json');
  assert.equal(json.body.words[0].headword, 'deter');
  assert.equal(json.body.words[0].meanings.length, 2);
  const csv = await api.call('GET', '/api/words/export?format=csv');
  assert.match(csv.body, /^headword,ipa,core_image/);
  assert.match(csv.body, /deter/);
  const anki = await api.call('GET', '/api/words/export?format=anki');
  assert.match(anki.body, /#separator:tab/);
  assert.match(anki.body, /\tlearning$/m);

  // 削除(子テーブルもカスケード削除される)
  assert.equal((await api.call('DELETE', `/api/words/${id}`)).status, 200);
  assert.equal((await api.call('GET', `/api/words/${id}`)).status, 404);
  assert.equal((await api.call('GET', '/api/words')).body.count, 0);
});

test('バリデーション: headword は必須', async (t) => {
  const api = await startServer();
  t.after(() => api.close());
  const res = await api.call('POST', '/api/words', { headword: '   ' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /headword/);
});
