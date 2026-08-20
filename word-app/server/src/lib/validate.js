/** 入力バリデーション。要件定義書 4.1.1 の件数上限もここで担保する。 */

export const LIMITS = {
  meanings: 2,
  derivatives: 2,
  example_sentences: 2,
  usage_distinctions: 2,
};

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

const str = (value) => (typeof value === 'string' ? value.trim() : '');

const asArray = (value, field) => {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${field} は配列で指定してください`);
  if (value.length > LIMITS[field]) {
    throw new ValidationError(`${field} は最大${LIMITS[field]}件までです(${value.length}件指定されました)`);
  }
  return value;
};

/** APIから受け取った単語データを、DB保存できる正規形に整える。 */
export function normalizeWordInput(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('リクエストボディが不正です');

  const headword = str(body.headword);
  if (!headword) throw new ValidationError('headword(見出し語)は必須です');
  if (headword.length > 100) throw new ValidationError('headword が長すぎます(100文字以内)');

  const meanings = asArray(body.meanings, 'meanings')
    .map((m, i) => ({
      order: Number.isInteger(m?.order) ? m.order : i + 1,
      meaning_ja: str(m?.meaning_ja),
      usage_context: str(m?.usage_context),
      common_phrase: str(m?.common_phrase),
    }))
    .filter((m) => m.meaning_ja || m.usage_context || m.common_phrase);

  const derivatives = asArray(body.derivatives, 'derivatives')
    .map((d) => ({
      form_type: str(d?.form_type),
      derivative_text: str(d?.derivative_text),
    }))
    .filter((d) => d.form_type || d.derivative_text);

  const example_sentences = asArray(body.example_sentences, 'example_sentences')
    .map((e) => ({
      category: e?.category === 'daily_tech' ? 'daily_tech' : 'business',
      sentence_en: str(e?.sentence_en),
      sentence_ja: str(e?.sentence_ja),
    }))
    .filter((e) => e.sentence_en || e.sentence_ja);

  const usage_distinctions = asArray(body.usage_distinctions, 'usage_distinctions')
    .map((u) => ({
      synonym: str(u?.synonym),
      distinction_note: str(u?.distinction_note),
    }))
    .filter((u) => u.synonym || u.distinction_note);

  return {
    headword,
    ipa: str(body.ipa),
    core_image: str(body.core_image),
    meanings,
    derivatives,
    example_sentences,
    usage_distinctions,
  };
}
