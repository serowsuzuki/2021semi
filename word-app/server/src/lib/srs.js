/**
 * 間隔反復アルゴリズム(要件定義書 4.3.1 / SM-2 簡略版)
 *
 * - ease_factor 初期値 2.5 / interval_days 初期値 0
 * - 正答: interval_days が0なら1、それ以外は interval_days × ease_factor を四捨五入。
 *         ease_factor は +0.05(上限 2.8)。次回復習日 = 本日 + 更新後 interval_days
 * - 誤答: interval_days を0にリセット。ease_factor は -0.2(下限 1.3)。次回復習日 = 本日
 * - interval_days が21以上なら status = 'mastered'、それ以外は 'learning'(未復習は 'new')
 */
import { addDays } from './date.js';

export const INITIAL_EASE_FACTOR = 2.5;
export const INITIAL_INTERVAL_DAYS = 0;
export const EASE_FACTOR_MAX = 2.8;
export const EASE_FACTOR_MIN = 1.3;
export const EASE_FACTOR_CORRECT_DELTA = 0.05;
export const EASE_FACTOR_INCORRECT_DELTA = -0.2;
export const MASTERED_INTERVAL_DAYS = 21;

const round = (value) => Math.round(value * 100) / 100;

/** interval_days から学習ステータスを決定する。 */
export function statusFor(intervalDays, { reviewed = true } = {}) {
  if (!reviewed) return 'new';
  return intervalDays >= MASTERED_INTERVAL_DAYS ? 'mastered' : 'learning';
}

/**
 * 復習結果を適用し、更新後のSRS値を返す。
 * @param {{ease_factor:number, interval_days:number}} word 現在の状態
 * @param {'correct'|'incorrect'} result 自己採点結果
 * @param {string} todayString 本日の日付 'YYYY-MM-DD'
 */
export function applyReview(word, result, todayString) {
  const easeFactor = Number.isFinite(word.ease_factor) ? word.ease_factor : INITIAL_EASE_FACTOR;
  const intervalDays = Number.isFinite(word.interval_days) ? word.interval_days : INITIAL_INTERVAL_DAYS;

  if (result === 'correct') {
    const nextInterval = intervalDays === 0 ? 1 : Math.round(intervalDays * easeFactor);
    const nextEase = round(Math.min(EASE_FACTOR_MAX, easeFactor + EASE_FACTOR_CORRECT_DELTA));
    return {
      ease_factor: nextEase,
      interval_days: nextInterval,
      next_review_date: addDays(todayString, nextInterval),
      status: statusFor(nextInterval),
    };
  }

  if (result === 'incorrect') {
    const nextEase = round(Math.max(EASE_FACTOR_MIN, easeFactor + EASE_FACTOR_INCORRECT_DELTA));
    return {
      ease_factor: nextEase,
      interval_days: 0,
      next_review_date: todayString, // 当日中に再度復習対象になる
      status: statusFor(0),
    };
  }

  throw new Error(`unknown review result: ${result}`);
}
