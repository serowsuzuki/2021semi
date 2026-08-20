/** 単語の全項目を表示する(詳細画面 / 登録前プレビュー共通)。 */

const CATEGORY_LABEL = { business: '業務(防衛・研究)', daily_tech: '日常・テック' };

export default function WordView({ word }) {
  return (
    <div className="word-view">
      <section className="card">
        <p className="word-view__headword">{word.headword}</p>
        {word.ipa && <p className="word-view__ipa">{word.ipa}</p>}
        {word.core_image && (
          <p className="word-view__core">
            <span className="tag">コアイメージ</span>
            {word.core_image}
          </p>
        )}
      </section>

      {word.meanings.length > 0 && (
        <section className="card">
          <h2 className="card__title">意味</h2>
          <ol className="meaning-list">
            {word.meanings.map((meaning, index) => (
              <li key={meaning.id ?? index} className="meaning">
                <p className="meaning__ja">{meaning.meaning_ja}</p>
                {meaning.usage_context && <p className="meaning__meta">場面: {meaning.usage_context}</p>}
                {meaning.common_phrase && (
                  <p className="meaning__meta">よく使う表現: <code>{meaning.common_phrase}</code></p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {word.derivatives.length > 0 && (
        <section className="card">
          <h2 className="card__title">派生語</h2>
          <ul className="chip-list">
            {word.derivatives.map((derivative, index) => (
              <li key={derivative.id ?? index} className="chip">
                <span className="chip__label">{derivative.form_type}</span>
                {derivative.derivative_text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {word.example_sentences.length > 0 && (
        <section className="card">
          <h2 className="card__title">例文</h2>
          {word.example_sentences.map((example, index) => (
            <div key={example.id ?? index} className="example">
              <span className="tag">{CATEGORY_LABEL[example.category] ?? example.category}</span>
              <p className="example__en">{example.sentence_en}</p>
              <p className="example__ja">{example.sentence_ja}</p>
            </div>
          ))}
        </section>
      )}

      {word.usage_distinctions.length > 0 && (
        <section className="card">
          <h2 className="card__title">使い分け</h2>
          <ul className="distinction-list">
            {word.usage_distinctions.map((distinction, index) => (
              <li key={distinction.id ?? index}>
                <span className="chip__label">vs {distinction.synonym}</span>
                {distinction.distinction_note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
