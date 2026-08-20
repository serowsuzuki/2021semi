import { randomUUID } from 'node:crypto';
import { transaction } from '../db/index.js';
import { today, nowTimestamp, startOfTodayTimestamp } from '../lib/date.js';
import { applyReview, INITIAL_EASE_FACTOR, INITIAL_INTERVAL_DAYS } from '../lib/srs.js';

export class NotFoundError extends Error {
  constructor(message = '対象の単語が見つかりません') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

const CHILD_TABLES = [
  { table: 'meanings', key: 'meanings', columns: ['"order"', 'meaning_ja', 'usage_context', 'common_phrase'], order: '"order" ASC, rowid ASC' },
  { table: 'derivatives', key: 'derivatives', columns: ['form_type', 'derivative_text'], order: 'rowid ASC' },
  { table: 'example_sentences', key: 'example_sentences', columns: ['category', 'sentence_en', 'sentence_ja'], order: 'rowid ASC' },
  { table: 'usage_distinctions', key: 'usage_distinctions', columns: ['synonym', 'distinction_note'], order: 'rowid ASC' },
];

const unquote = (column) => column.replaceAll('"', '');

function insertChildren(db, wordId, input) {
  for (const spec of CHILD_TABLES) {
    const rows = input[spec.key] ?? [];
    const placeholders = spec.columns.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO ${spec.table} (id, word_id, ${spec.columns.join(', ')}) VALUES (?, ?, ${placeholders})`,
    );
    rows.forEach((row, index) => {
      const values = spec.columns.map((column) => {
        const name = unquote(column);
        if (name === 'order') return Number.isInteger(row.order) ? row.order : index + 1;
        return row[name] ?? '';
      });
      stmt.run(randomUUID(), wordId, ...values);
    });
  }
}

function attachChildren(db, words) {
  if (words.length === 0) return words;
  const byId = new Map(words.map((word) => [word.id, word]));
  for (const word of words) {
    for (const spec of CHILD_TABLES) word[spec.key] = [];
  }
  const placeholders = words.map(() => '?').join(', ');
  const ids = words.map((word) => word.id);

  for (const spec of CHILD_TABLES) {
    const rows = db
      .prepare(
        `SELECT id, word_id, ${spec.columns.join(', ')} FROM ${spec.table}
         WHERE word_id IN (${placeholders}) ORDER BY ${spec.order}`,
      )
      .all(...ids);
    for (const row of rows) {
      const word = byId.get(row.word_id);
      if (!word) continue;
      const { word_id: _ignored, ...rest } = row;
      word[spec.key].push(rest);
    }
  }
  return words;
}

const BASE_COLUMNS = `id, headword, ipa, core_image, created_at, updated_at,
  status, ease_factor, interval_days, next_review_date`;

/** 単語一覧を取得する。due=true で復習対象のみ、status で絞り込み。 */
export function listWords(db, { due = false, status = null, search = null } = {}) {
  const conditions = [];
  const params = [];
  if (due) {
    conditions.push('next_review_date <= ?');
    params.push(today());
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('lower(headword) LIKE ?');
    params.push(`%${search.toLowerCase()}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT ${BASE_COLUMNS} FROM words ${where} ORDER BY created_at DESC`)
    .all(...params);
  return attachChildren(db, rows);
}

/** 復習キュー。対象0件かつ includeAll のときは全単語を返す(要件 4.3)。 */
export function reviewQueue(db, { includeAll = false } = {}) {
  const due = listWords(db, { due: true });
  if (due.length > 0 || !includeAll) return { words: due, fallback: false };
  return { words: listWords(db, {}), fallback: true };
}

export function getWord(db, id, { withHistory = true } = {}) {
  const row = db.prepare(`SELECT ${BASE_COLUMNS} FROM words WHERE id = ?`).get(id);
  if (!row) throw new NotFoundError();
  const [word] = attachChildren(db, [row]);
  if (withHistory) word.review_history = listHistory(db, id);
  return word;
}

export function listHistory(db, wordId) {
  return db
    .prepare(
      `SELECT id, reviewed_at, result, interval_days_after, ease_factor_after
       FROM review_history WHERE word_id = ? ORDER BY reviewed_at DESC, rowid DESC`,
    )
    .all(wordId);
}

export function createWord(db, input) {
  const id = randomUUID();
  const timestamp = nowTimestamp();
  const todayString = today();

  return transaction(db, () => {
    try {
      db.prepare(
        `INSERT INTO words (id, headword, ipa, core_image, created_at, updated_at,
           status, ease_factor, interval_days, next_review_date)
         VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
      ).run(
        id,
        input.headword,
        input.ipa,
        input.core_image,
        timestamp,
        timestamp,
        INITIAL_EASE_FACTOR,
        INITIAL_INTERVAL_DAYS,
        todayString, // 登録直後から復習対象になる
      );
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        throw new ConflictError(`「${input.headword}」は既に登録されています`);
      }
      throw err;
    }
    insertChildren(db, id, input);
    return getWord(db, id);
  });
}

/** 単語情報を更新する(子テーブルは全置換)。SRSの状態は変更しない。 */
export function updateWord(db, id, input) {
  return transaction(db, () => {
    const exists = db.prepare('SELECT id FROM words WHERE id = ?').get(id);
    if (!exists) throw new NotFoundError();
    try {
      db.prepare(
        `UPDATE words SET headword = ?, ipa = ?, core_image = ?, updated_at = ? WHERE id = ?`,
      ).run(input.headword, input.ipa, input.core_image, nowTimestamp(), id);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        throw new ConflictError(`「${input.headword}」は既に登録されています`);
      }
      throw err;
    }
    for (const spec of CHILD_TABLES) {
      db.prepare(`DELETE FROM ${spec.table} WHERE word_id = ?`).run(id);
    }
    insertChildren(db, id, input);
    return getWord(db, id);
  });
}

export function deleteWord(db, id) {
  const result = db.prepare('DELETE FROM words WHERE id = ?').run(id);
  if (result.changes === 0) throw new NotFoundError();
  return { id, deleted: true };
}

/** 復習結果を記録し、次回復習日を再計算する(要件 4.3.1)。 */
export function recordReview(db, id, result) {
  if (result !== 'correct' && result !== 'incorrect') {
    const err = new Error('result は correct / incorrect のいずれかです');
    err.status = 400;
    throw err;
  }
  return transaction(db, () => {
    const word = db
      .prepare('SELECT id, ease_factor, interval_days FROM words WHERE id = ?')
      .get(id);
    if (!word) throw new NotFoundError();

    const next = applyReview(word, result, today());
    db.prepare(
      `UPDATE words SET ease_factor = ?, interval_days = ?, next_review_date = ?, status = ?
       WHERE id = ?`,
    ).run(next.ease_factor, next.interval_days, next.next_review_date, next.status, id);

    db.prepare(
      `INSERT INTO review_history (id, word_id, reviewed_at, result, interval_days_after, ease_factor_after)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), id, nowTimestamp(), result, next.interval_days, next.ease_factor);

    return getWord(db, id);
  });
}

/** 一覧画面に表示する全体統計(要件 4.4)。 */
export function getStats(db) {
  const todayString = today();
  const total = db.prepare('SELECT COUNT(*) AS count FROM words').get().count;
  const due = db
    .prepare('SELECT COUNT(*) AS count FROM words WHERE next_review_date <= ?')
    .get(todayString).count;
  const byStatus = db.prepare('SELECT status, COUNT(*) AS count FROM words GROUP BY status').all();
  const reviewsToday = db
    .prepare('SELECT COUNT(*) AS count FROM review_history WHERE reviewed_at >= ?')
    .get(startOfTodayTimestamp()).count;
  const counts = Object.fromEntries(byStatus.map((row) => [row.status, row.count]));

  return {
    total,
    due,
    new: counts.new ?? 0,
    learning: counts.learning ?? 0,
    mastered: counts.mastered ?? 0,
    reviews_today: reviewsToday,
    today: todayString,
  };
}
