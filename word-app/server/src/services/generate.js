/**
 * 単語情報の自動生成(要件定義書 4.1.1)
 * Anthropic Messages API をバックエンド経由で呼び出す。
 * APIキーはサーバー側でのみ扱い、フロントエンドには露出させない。
 */
import Anthropic from '@anthropic-ai/sdk';
import { LIMITS } from '../lib/validate.js';

export const DEFAULT_MODEL = 'claude-opus-5';

export class GenerationError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'GenerationError';
    this.status = status;
  }
}

/** 出力フォーマット(固定)。Structured Outputs でJSON構造を保証する。 */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    headword: { type: 'string', description: '見出し語(入力された英単語をそのまま)' },
    ipa: { type: 'string', description: 'IPA表記と強勢位置を1行で。20字以内' },
    core_image: { type: 'string', description: '語源ベースのコアイメージ。40字以内の日本語1行' },
    meanings: {
      type: 'array',
      description: `意味。最大${LIMITS.meanings}件`,
      items: {
        type: 'object',
        properties: {
          meaning_ja: { type: 'string', description: '意味(日本語、15〜20字以内)' },
          usage_context: { type: 'string', description: '使う場面(15〜20字以内)' },
          common_phrase: { type: 'string', description: 'よく使われる慣用表現' },
        },
        required: ['meaning_ja', 'usage_context', 'common_phrase'],
        additionalProperties: false,
      },
    },
    derivatives: {
      type: 'array',
      description: `派生語。最大${LIMITS.derivatives}件`,
      items: {
        type: 'object',
        properties: {
          form_type: { type: 'string', description: '品詞・形(動詞変化形/名詞形/形容詞形/副詞形など)' },
          derivative_text: { type: 'string', description: '派生語そのもの' },
        },
        required: ['form_type', 'derivative_text'],
        additionalProperties: false,
      },
    },
    example_sentences: {
      type: 'array',
      description: '例文はちょうど2件。business(防衛・研究・ブリーフィング)1件、daily_tech(日常・テック・アウトドア)1件',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['business', 'daily_tech'] },
          sentence_en: { type: 'string' },
          sentence_ja: { type: 'string' },
        },
        required: ['category', 'sentence_en', 'sentence_ja'],
        additionalProperties: false,
      },
    },
    usage_distinctions: {
      type: 'array',
      description: `使い分け。最大${LIMITS.usage_distinctions}件`,
      items: {
        type: 'object',
        properties: {
          synonym: { type: 'string', description: '比較対象の類義語' },
          distinction_note: { type: 'string', description: '違いの説明(25字以内)' },
        },
        required: ['synonym', 'distinction_note'],
        additionalProperties: false,
      },
    },
  },
  required: ['headword', 'ipa', 'core_image', 'meanings', 'derivatives', 'example_sentences', 'usage_distinctions'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `あなたは英語学習コーチです。学習者が英単語を「暗記する」のではなく「実際に使えるようになる」ことを最優先に、単語情報を作成します。説明はすべて日本語で行います。

# 学習者プロファイル
- 英語レベル: TOEIC 700 ±50
- 背景: 元自衛官。現在は防衛装備(特に誘導システム)のR&Dに従事
- 関心分野: 安全保障、防衛技術、物理学、量子力学、科学技術、ガジェット、キャンプ・アウトドア・登山

# 各項目の作成方針
1. ipa: IPA表記と強勢位置を1行で。20字以内。
2. core_image: 語源をふまえ、その単語に一貫して流れる意味を1行で。40字以内。
3. meanings: 最大${LIMITS.meanings}件。実用頻度の高い意味のみ。meaning_ja と usage_context はそれぞれ15〜20字以内。common_phrase はその意味でよく使われる慣用表現・コロケーションを1つ。
4. derivatives: 最大${LIMITS.derivatives}件。実際に使う形のみ。
5. example_sentences: ちょうど2件。1件目は category="business"(防衛・研究・ブリーフィング文脈)、2件目は category="daily_tech"(日常・テック・ガジェット・アウトドア文脈)。いずれも「学習者自身がその場面で口にする / 書く」ことを想定した自然な英文にし、日本語訳を併記する。
6. usage_distinctions: 最大${LIMITS.usage_distinctions}件。日本人が混同しやすい類義語との違いを25字以内で。差が薄い比較しかできない場合は空配列にする。

# スタイル
- セミフォーマルを基本とし、業務文脈はややフォーマル、日常文脈は軽くカジュアルも可。
- 語彙・構文は TOEIC 750〜850 レベル(現状より少し上のストレッチ)を目安にする。
- 不自然な直訳や教科書的な例文は書かない。
- 低価値な類義語比較、過剰な語源解説、辞書的な羅列、冗長な説明はしない。

# 出力
- 上記の件数上限と文字数目安は厳守する(超過すると出力が途中で切れて解析エラーになる)。
- 指定されたJSONスキーマに従うオブジェクトのみを出力し、前置き・説明文・コードフェンスは一切含めない。`;

let cachedClient = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new GenerationError(
      'ANTHROPIC_API_KEY が設定されていません。サーバーの .env に設定してください。',
      503,
    );
  }
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

function extractJson(message) {
  if (message.parsed_output) return message.parsed_output;
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!text) throw new GenerationError('AIからの応答が空でした。もう一度お試しください。');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fallthrough */
      }
    }
    throw new GenerationError('AIの応答をJSONとして解析できませんでした。もう一度お試しください。');
  }
}

/** 生成結果を要件どおりの件数・形に整える。 */
function shape(raw, headword) {
  const arr = (value, max) => (Array.isArray(value) ? value.slice(0, max) : []);
  const text = (value) => (typeof value === 'string' ? value.trim() : '');

  const examples = arr(raw?.example_sentences, LIMITS.example_sentences).map((e) => ({
    category: e?.category === 'daily_tech' ? 'daily_tech' : 'business',
    sentence_en: text(e?.sentence_en),
    sentence_ja: text(e?.sentence_ja),
  }));

  return {
    headword: text(raw?.headword) || headword,
    ipa: text(raw?.ipa),
    core_image: text(raw?.core_image),
    meanings: arr(raw?.meanings, LIMITS.meanings).map((m, i) => ({
      order: i + 1,
      meaning_ja: text(m?.meaning_ja),
      usage_context: text(m?.usage_context),
      common_phrase: text(m?.common_phrase),
    })),
    derivatives: arr(raw?.derivatives, LIMITS.derivatives).map((d) => ({
      form_type: text(d?.form_type),
      derivative_text: text(d?.derivative_text),
    })),
    example_sentences: examples,
    usage_distinctions: arr(raw?.usage_distinctions, LIMITS.usage_distinctions).map((u) => ({
      synonym: text(u?.synonym),
      distinction_note: text(u?.distinction_note),
    })),
  };
}

/**
 * 英単語から単語情報を生成する(保存はしない)。
 * @param {string} headword 見出し語
 */
export async function generateWordInfo(headword) {
  const word = String(headword ?? '').trim();
  if (!word) {
    throw new GenerationError('英単語を入力してください', 400);
  }

  const client = getClient();
  let message;
  try {
    message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: process.env.ANTHROPIC_EFFORT || 'medium',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `次の英単語の情報を作成してください: ${word}`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new GenerationError('Anthropic APIの認証に失敗しました。APIキーを確認してください。', 502);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new GenerationError('Anthropic APIのレート制限に達しました。少し待って再試行してください。', 429);
    }
    if (err instanceof Anthropic.APIError) {
      throw new GenerationError(`Anthropic APIエラー (${err.status}): ${err.message}`, 502);
    }
    throw new GenerationError(`単語情報の生成に失敗しました: ${err.message}`);
  }

  if (message.stop_reason === 'refusal') {
    throw new GenerationError('AIがこの単語の情報生成を拒否しました。別の単語をお試しください。');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new GenerationError('AIの応答が長すぎて途中で切れました。もう一度お試しください。');
  }

  return shape(extractJson(message), word);
}
