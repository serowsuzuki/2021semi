import { useId, useState } from 'react';

/** 項目ごとの構造化フォーム(要件 4.2)。件数上限はサーバー側と同じ2件。 */
const MAX_ITEMS = 2;

const SECTIONS = [
  {
    key: 'meanings',
    title: '意味',
    blank: { meaning_ja: '', usage_context: '', common_phrase: '' },
    fields: [
      { name: 'meaning_ja', label: '意味(日本語)', placeholder: '15〜20字程度' },
      { name: 'usage_context', label: '使う場面', placeholder: '15〜20字程度' },
      { name: 'common_phrase', label: 'よく使われる慣用表現' },
    ],
  },
  {
    key: 'derivatives',
    title: '派生語',
    blank: { form_type: '', derivative_text: '' },
    fields: [
      { name: 'form_type', label: '品詞・形', placeholder: '名詞形 / 形容詞形 など' },
      { name: 'derivative_text', label: '派生語' },
    ],
  },
  {
    key: 'example_sentences',
    title: '例文',
    blank: { category: 'business', sentence_en: '', sentence_ja: '' },
    fields: [
      {
        name: 'category',
        label: '文脈',
        type: 'select',
        options: [
          { value: 'business', label: '業務(防衛・研究)' },
          { value: 'daily_tech', label: '日常・テック' },
        ],
      },
      { name: 'sentence_en', label: '英文', type: 'textarea' },
      { name: 'sentence_ja', label: '日本語訳', type: 'textarea' },
    ],
  },
  {
    key: 'usage_distinctions',
    title: '使い分け',
    blank: { synonym: '', distinction_note: '' },
    fields: [
      { name: 'synonym', label: '類義語' },
      { name: 'distinction_note', label: '違いの説明', placeholder: '25字以内' },
    ],
  },
];

function Field({ field, value, onChange }) {
  const id = `${useId()}-${field.name}`;
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export default function WordForm({ initialWord, onSubmit, onCancel, submitLabel = '保存', busy = false }) {
  const [word, setWord] = useState(() => structuredClone(initialWord));

  const setValue = (key, value) => setWord((current) => ({ ...current, [key]: value }));

  const setItem = (key, index, name, value) =>
    setWord((current) => ({
      ...current,
      [key]: current[key].map((item, i) => (i === index ? { ...item, [name]: value } : item)),
    }));

  const addItem = (section) =>
    setWord((current) => ({
      ...current,
      [section.key]: [...current[section.key], { ...section.blank }],
    }));

  const removeItem = (key, index) =>
    setWord((current) => ({ ...current, [key]: current[key].filter((_, i) => i !== index) }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(word);
  };

  return (
    <form className="word-form" onSubmit={handleSubmit}>
      <section className="card">
        <Field
          field={{ name: 'headword', label: '見出し語(英単語)' }}
          value={word.headword}
          onChange={(value) => setValue('headword', value)}
        />
        <Field
          field={{ name: 'ipa', label: '発音(IPA・強勢位置)', placeholder: '/dɪˈtɜːr/ 第2音節強勢' }}
          value={word.ipa}
          onChange={(value) => setValue('ipa', value)}
        />
        <Field
          field={{ name: 'core_image', label: 'コアイメージ', placeholder: '40字以内' }}
          value={word.core_image}
          onChange={(value) => setValue('core_image', value)}
        />
      </section>

      {SECTIONS.map((section) => (
        <section className="card" key={section.key}>
          <div className="card__header">
            <h2 className="card__title">{section.title}</h2>
            <span className="card__hint">最大{MAX_ITEMS}件</span>
          </div>

          {word[section.key].map((item, index) => (
            <div className="form-item" key={index}>
              <div className="form-item__header">
                <span className="form-item__index">{index + 1}</span>
                <button type="button" className="link-button" onClick={() => removeItem(section.key, index)}>
                  削除
                </button>
              </div>
              {section.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={item[field.name] ?? ''}
                  onChange={(value) => setItem(section.key, index, field.name, value)}
                />
              ))}
            </div>
          ))}

          {word[section.key].length < MAX_ITEMS && (
            <button type="button" className="button button--ghost" onClick={() => addItem(section)}>
              + {section.title}を追加
            </button>
          )}
        </section>
      ))}

      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={busy}>
          キャンセル
        </button>
        <button type="submit" className="button button--primary" disabled={busy}>
          {busy ? '保存中…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
