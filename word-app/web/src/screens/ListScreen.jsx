import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import Header from '../components/Header.jsx';

const STATUS_LABEL = { new: '未復習', learning: '学習中', mastered: '習得済み' };

function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export default function ListScreen({ notify }) {
  const [words, setWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.listWords({ q: search, status: filter }), api.stats()])
      .then(([list, statistics]) => {
        if (cancelled) return;
        setWords(list.words);
        setStats(statistics);
      })
      .catch((error) => !cancelled && notify(error.message, 'error'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search, filter, notify]);

  const dueCount = stats?.due ?? 0;

  return (
    <>
      <Header
        title="英単語学習"
        actions={
          <button type="button" className="header__icon" onClick={() => setShowExport((v) => !v)} title="エクスポート">
            ⬇
          </button>
        }
      />

      {showExport && (
        <div className="card export-menu">
          <h2 className="card__title">エクスポート</h2>
          <p className="card__hint">現在の絞り込み({filter ? STATUS_LABEL[filter] : '全件'})を対象にダウンロードします。</p>
          <div className="export-menu__links">
            <a className="button button--ghost" href={api.exportUrl('json', filter)}>JSON</a>
            <a className="button button--ghost" href={api.exportUrl('csv', filter)}>CSV</a>
            <a className="button button--ghost" href={api.exportUrl('anki', filter)}>Anki形式</a>
          </div>
        </div>
      )}

      <section className="stats">
        <div className="stats__item">
          <span className="stats__value">{stats?.total ?? '–'}</span>
          <span className="stats__label">登録単語</span>
        </div>
        <div className="stats__item stats__item--accent">
          <span className="stats__value">{stats?.due ?? '–'}</span>
          <span className="stats__label">復習対象</span>
        </div>
        <div className="stats__item">
          <span className="stats__value">{stats?.mastered ?? '–'}</span>
          <span className="stats__label">習得済み</span>
        </div>
        <div className="stats__item">
          <span className="stats__value">{stats?.reviews_today ?? '–'}</span>
          <span className="stats__label">本日の復習</span>
        </div>
      </section>

      <div className="list-actions">
        <button type="button" className="button button--primary button--block" onClick={() => navigate('/review')}>
          {dueCount > 0 ? `復習する(${dueCount}件)` : '復習する(対象なし)'}
        </button>
      </div>

      <div className="filters">
        <input
          type="search"
          className="filters__search"
          placeholder="単語を検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="filters__chips">
          {[
            ['', 'すべて'],
            ['new', '未復習'],
            ['learning', '学習中'],
            ['mastered', '習得済み'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={`filter-chip ${filter === value ? 'filter-chip--active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="placeholder">読み込み中…</p>
      ) : words.length === 0 ? (
        <p className="placeholder">
          {search || filter ? '該当する単語がありません。' : 'まだ単語がありません。右下の + から登録しましょう。'}
        </p>
      ) : (
        <ul className="word-list">
          {words.map((word) => (
            <li key={word.id}>
              <button type="button" className="word-card" onClick={() => navigate(`/word/${word.id}`)}>
                <div className="word-card__main">
                  <p className="word-card__headword">{word.headword}</p>
                  {word.ipa && <p className="word-card__ipa">{word.ipa}</p>}
                  <p className="word-card__meaning">
                    {word.meanings.map((meaning) => meaning.meaning_ja).filter(Boolean).join(' / ') || '意味未登録'}
                  </p>
                </div>
                <div className="word-card__side">
                  <StatusBadge status={word.status} />
                  <span className="word-card__date">次回 {word.next_review_date}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="fab" onClick={() => navigate('/add')} aria-label="単語を追加">
        +
      </button>
    </>
  );
}
