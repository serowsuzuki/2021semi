/**
 * 日付ユーティリティ。
 * 復習日はサーバーのローカルタイムゾーン基準の「日付」で扱う。
 * 日本時間で運用する場合は環境変数 TZ=Asia/Tokyo を設定する。
 */

/** Dateを 'YYYY-MM-DD' 形式(ローカルタイムゾーン)に変換する。 */
export function toDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 本日の日付文字列。 */
export function today() {
  return toDateString();
}

/** 'YYYY-MM-DD' に日数を加算した日付文字列を返す。 */
export function addDays(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** ISO8601(ミリ秒付きUTC)のタイムスタンプ。 */
export function nowTimestamp() {
  return new Date().toISOString();
}

/** ローカルタイムゾーンにおける本日0時をISO8601(UTC)で返す。 */
export function startOfTodayTimestamp() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}
