import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import Header from '../components/Header.jsx';
import WordView from '../components/WordView.jsx';
import WordForm from '../components/WordForm.jsx';

const STATUS_LABEL = { new: '未復習', learning: '学習中', mastered: '習得済み' };

const formatTimestamp = (value) =>
  new Date(value).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });

/** 詳細・編集画面(要件 4.2)と学習履歴の表示(要件 4.4)。 */
export default function DetailScreen({ id, notify, onChanged }) {
  const [word, setWord] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api
      .getWord(id)
      .then(setWord)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  const handleSave = async (updated) => {
    setSaving(true);
    try {
      const saved = await api.updateWord(id, updated);
      setWord(saved);
      setEditing(false);
      onChanged?.();
      notify('変更を保存しました');
    } catch (err) {
      notify(err.message, 'error'); // 編集内容は破棄せず、フォームに残す
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`「${word.headword}」を削除します。よろしいですか?`)) return;
    try {
      await api.deleteWord(id);
      onChanged?.();
      notify('削除しました');
      navigate('/');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (error) {
    return (
      <>
        <Header title="詳細" back="/" />
        <p className="placeholder">{error}</p>
      </>
    );
  }
  if (!word) {
    return (
      <>
        <Header title="詳細" back="/" />
        <p className="placeholder">読み込み中…</p>
      </>
    );
  }

  if (editing) {
    return (
      <>
        <Header title="編集" back="/" />
        <WordForm
          initialWord={word}
          submitLabel="保存"
          busy={saving}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  }

  return (
    <>
      <Header
        title={word.headword}
        back="/"
        actions={
          <button type="button" className="header__icon" onClick={() => setEditing(true)}>
            編集
          </button>
        }
      />

      <section className="card learning-status">
        <div>
          <span className={`badge badge--${word.status}`}>{STATUS_LABEL[word.status]}</span>
          <span className="learning-status__meta">
            次回 {word.next_review_date} / 間隔 {word.interval_days}日 / EF {word.ease_factor.toFixed(2)}
          </span>
        </div>
        <p className="learning-status__meta">
          登録 {formatTimestamp(word.created_at)}
          {word.updated_at !== word.created_at && ` / 更新 ${formatTimestamp(word.updated_at)}`}
        </p>
      </section>

      <WordView word={word} />

      <section className="card">
        <h2 className="card__title">学習履歴</h2>
        {word.review_history.length === 0 ? (
          <p className="card__hint">まだ復習していません。</p>
        ) : (
          <ol className="history-list">
            {word.review_history.map((entry) => (
              <li key={entry.id} className={`history history--${entry.result}`}>
                <span className="history__result">{entry.result === 'correct' ? '分かった' : 'わからなかった'}</span>
                <span className="history__time">{formatTimestamp(entry.reviewed_at)}</span>
                <span className="history__meta">
                  → 次回間隔 {entry.interval_days_after}日 / EF {entry.ease_factor_after.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="form-actions">
        <button type="button" className="button button--danger" onClick={handleDelete}>
          この単語を削除
        </button>
      </div>
    </>
  );
}
