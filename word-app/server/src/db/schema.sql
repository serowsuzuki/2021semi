-- 英単語学習アプリ スキーマ (要件定義書 7.2 に対応)
-- SQL方言に依存しない構成にし、将来のPostgreSQL移行を容易にする。

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
  id               TEXT PRIMARY KEY,
  user_id          TEXT REFERENCES users(id) ON DELETE CASCADE, -- 将来の同期機能用(現状はNULL)
  headword         TEXT    NOT NULL,
  ipa              TEXT    NOT NULL DEFAULT '',
  core_image       TEXT    NOT NULL DEFAULT '',
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'new',
  ease_factor      REAL    NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  next_review_date TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS meanings (
  id            TEXT PRIMARY KEY,
  word_id       TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  "order"       INTEGER NOT NULL DEFAULT 1,
  meaning_ja    TEXT NOT NULL DEFAULT '',
  usage_context TEXT NOT NULL DEFAULT '',
  common_phrase TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS derivatives (
  id              TEXT PRIMARY KEY,
  word_id         TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  form_type       TEXT NOT NULL DEFAULT '',
  derivative_text TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS example_sentences (
  id          TEXT PRIMARY KEY,
  word_id     TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'business', -- business / daily_tech
  sentence_en TEXT NOT NULL DEFAULT '',
  sentence_ja TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS usage_distinctions (
  id               TEXT PRIMARY KEY,
  word_id          TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  synonym          TEXT NOT NULL DEFAULT '',
  distinction_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS review_history (
  id                  TEXT PRIMARY KEY,
  word_id             TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  reviewed_at         TEXT NOT NULL,
  result              TEXT NOT NULL, -- correct / incorrect
  interval_days_after INTEGER NOT NULL,
  ease_factor_after   REAL NOT NULL
);

-- 同じ見出し語の重複登録を防ぐ(大文字小文字は区別しない / 将来のuser_id単位)
CREATE UNIQUE INDEX IF NOT EXISTS idx_words_headword
  ON words (COALESCE(user_id, ''), lower(headword));
CREATE INDEX IF NOT EXISTS idx_words_next_review ON words (next_review_date);
CREATE INDEX IF NOT EXISTS idx_meanings_word ON meanings (word_id, "order");
CREATE INDEX IF NOT EXISTS idx_derivatives_word ON derivatives (word_id);
CREATE INDEX IF NOT EXISTS idx_examples_word ON example_sentences (word_id);
CREATE INDEX IF NOT EXISTS idx_distinctions_word ON usage_distinctions (word_id);
CREATE INDEX IF NOT EXISTS idx_history_word ON review_history (word_id, reviewed_at DESC);
