import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../App.jsx';
import Header from '../components/Header.jsx';

const CATEGORY_LABEL = { business: '業務(防衛・研究)', daily_tech: '日常・テック' };

/**
 * 復習(要件 4.3)
 * 単語・発音を表示 → 「意味を確認する」→ 意味・例文を表示 → 分かった/わからなかった
 * わからなかった単語はその日のうちにもう一度出題される(キュー末尾に1度だけ戻す)。
 */
export default function ReviewScreen({ notify, onFinished }) {
  const [queue, setQueue] = useState(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState({ correct: 0, incorrect: 0 });
  const [requeued, setRequeued] = useState(() => new Set());
  const [noDue, setNoDue] = useState(false);

  const loadQueue = (includeAll) => {
    setQueue(null);
    api
      .reviewQueue(includeAll)
      .then((response) => {
        if (response.count === 0) {
          setNoDue(true);
          setQueue([]);
          return;
        }
        setNoDue(false);
        setQueue(response.words);
        setIndex(0);
        setRevealed(false);
        setResult({ correct: 0, incorrect: 0 });
        setRequeued(new Set());
      })
      .catch((error) => {
        notify(error.message, 'error');
        setQueue([]);
      });
  };

  useEffect(() => loadQueue(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = async (value) => {
    const word = queue[index];
    setSubmitting(true);
    try {
      await api.submitReview(word.id, value);
      setResult((current) => ({ ...current, [value]: current[value] + 1 }));

      let nextQueue = queue;
      // 誤答した単語は当日中にもう一度出題する(1回のみ再キュー)
      if (value === 'incorrect' && !requeued.has(word.id)) {
        nextQueue = [...queue, word];
        setQueue(nextQueue);
        setRequeued((current) => new Set(current).add(word.id));
      }
      setIndex((current) => current + 1);
      setRevealed(false);
      onFinished?.();
    } catch (error) {
      notify(error.message, 'error'); // 記録できなかった場合は同じ単語に留まる
    } finally {
      setSubmitting(false);
    }
  };

  if (queue === null) {
    return (
      <>
        <Header title="復習" back="/" />
        <p className="placeholder">読み込み中…</p>
      </>
    );
  }

  if (noDue) {
    return (
      <>
        <Header title="復習" back="/" />
        <div className="card review-done">
          <p className="review-done__title">本日の復習対象はありません</p>
          <p className="card__hint">お疲れさまでした。登録済みの単語すべてを対象に復習することもできます。</p>
          <button type="button" className="button button--primary button--block" onClick={() => loadQueue(true)}>
            全単語で復習する
          </button>
          <button type="button" className="button button--ghost button--block" onClick={() => navigate('/')}>
            一覧に戻る
          </button>
        </div>
      </>
    );
  }

  if (index >= queue.length) {
    return (
      <>
        <Header title="復習" back="/" />
        <div className="card review-done">
          <p className="review-done__title">復習完了!</p>
          <p className="review-done__score">
            分かった {result.correct} / わからなかった {result.incorrect}
          </p>
          <button type="button" className="button button--primary button--block" onClick={() => navigate('/')}>
            一覧に戻る
          </button>
        </div>
      </>
    );
  }

  const word = queue[index];

  return (
    <>
      <Header title={`復習 ${index + 1} / ${queue.length}`} back="/" />
      <div className="progress">
        <div className="progress__bar" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <section className="card quiz">
        <p className="quiz__headword">{word.headword}</p>
        {word.ipa && <p className="quiz__ipa">{word.ipa}</p>}

        {!revealed ? (
          <button type="button" className="button button--primary button--block" onClick={() => setRevealed(true)}>
            意味を確認する
          </button>
        ) : (
          <div className="quiz__answer">
            {word.core_image && <p className="quiz__core">{word.core_image}</p>}
            <ol className="meaning-list">
              {word.meanings.map((meaning) => (
                <li key={meaning.id} className="meaning">
                  <p className="meaning__ja">{meaning.meaning_ja}</p>
                  {meaning.usage_context && <p className="meaning__meta">場面: {meaning.usage_context}</p>}
                </li>
              ))}
            </ol>
            {word.example_sentences.map((example) => (
              <div key={example.id} className="example">
                <span className="tag">{CATEGORY_LABEL[example.category] ?? example.category}</span>
                <p className="example__en">{example.sentence_en}</p>
                <p className="example__ja">{example.sentence_ja}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {revealed && (
        <div className="quiz-actions">
          <button
            type="button"
            className="button button--danger button--block"
            disabled={submitting}
            onClick={() => answer('incorrect')}
          >
            わからなかった
          </button>
          <button
            type="button"
            className="button button--success button--block"
            disabled={submitting}
            onClick={() => answer('correct')}
          >
            分かった
          </button>
        </div>
      )}

      <button type="button" className="link-button link-button--center" onClick={() => navigate('/')}>
        復習を終了する
      </button>
    </>
  );
}
