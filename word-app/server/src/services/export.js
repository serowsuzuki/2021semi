/** エクスポート機能(要件定義書 7.4)。全件 / ステータス絞り込みの両方に対応する。 */

/** 1単語 = ネストしたJSONオブジェクト(自動生成フォーマットをそのまま再現できる形)。 */
export function toJsonExport(words) {
  return words.map((word) => ({
    id: word.id,
    headword: word.headword,
    ipa: word.ipa,
    core_image: word.core_image,
    meanings: word.meanings.map(({ order, meaning_ja, usage_context, common_phrase }) => ({
      order,
      meaning_ja,
      usage_context,
      common_phrase,
    })),
    derivatives: word.derivatives.map(({ form_type, derivative_text }) => ({
      form_type,
      derivative_text,
    })),
    example_sentences: word.example_sentences.map(({ category, sentence_en, sentence_ja }) => ({
      category,
      sentence_en,
      sentence_ja,
    })),
    usage_distinctions: word.usage_distinctions.map(({ synonym, distinction_note }) => ({
      synonym,
      distinction_note,
    })),
    learning: {
      status: word.status,
      ease_factor: word.ease_factor,
      interval_days: word.interval_days,
      next_review_date: word.next_review_date,
    },
    created_at: word.created_at,
    updated_at: word.updated_at,
  }));
}

const escapeCsv = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const CSV_HEADER = [
  'headword',
  'ipa',
  'core_image',
  'meaning_ja',
  'usage_context',
  'sentence_en',
  'sentence_ja',
  'status',
  'next_review_date',
];

/** 表形式ツール(Excel等)向けのフラットCSV。 */
export function toCsv(words) {
  const rows = [CSV_HEADER.join(',')];
  for (const word of words) {
    const first = word.meanings[0] ?? {};
    const business = word.example_sentences.find((e) => e.category === 'business');
    const example = business ?? word.example_sentences[0] ?? {};
    rows.push(
      [
        word.headword,
        word.ipa,
        word.core_image,
        word.meanings.map((m) => m.meaning_ja).filter(Boolean).join(' / '),
        first.usage_context ?? '',
        example.sentence_en ?? '',
        example.sentence_ja ?? '',
        word.status,
        word.next_review_date,
      ]
        .map(escapeCsv)
        .join(','),
    );
  }
  return `${rows.join('\r\n')}\r\n`;
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

/** Anki import形式(タブ区切り)。表=単語、裏=意味・例文。 */
export function toAnkiCsv(words) {
  const lines = ['#separator:tab', '#html:true', '#columns:Front\tBack\tTags'];
  for (const word of words) {
    const front = [escapeHtml(word.headword), word.ipa ? escapeHtml(word.ipa) : null]
      .filter(Boolean)
      .join('<br>');

    const back = [
      ...word.meanings.map(
        (m) =>
          `<b>${escapeHtml(m.meaning_ja)}</b>${m.usage_context ? `(${escapeHtml(m.usage_context)})` : ''}`,
      ),
      word.core_image ? `<i>${escapeHtml(word.core_image)}</i>` : null,
      ...word.example_sentences.map(
        (e) => `${escapeHtml(e.sentence_en)}<br>${escapeHtml(e.sentence_ja)}`,
      ),
    ]
      .filter(Boolean)
      .join('<hr>');

    const sanitize = (text) => text.replaceAll('\t', ' ').replaceAll(/\r?\n/g, ' ');
    lines.push([sanitize(front), sanitize(back), word.status].join('\t'));
  }
  return `${lines.join('\n')}\n`;
}
