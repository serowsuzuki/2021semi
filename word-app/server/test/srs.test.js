import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReview, statusFor } from '../src/lib/srs.js';
import { addDays } from '../src/lib/date.js';

const TODAY = '2026-01-10';

test('初回正答で interval は1日、ease は+0.05', () => {
  const next = applyReview({ ease_factor: 2.5, interval_days: 0 }, 'correct', TODAY);
  assert.equal(next.interval_days, 1);
  assert.equal(next.ease_factor, 2.55);
  assert.equal(next.next_review_date, addDays(TODAY, 1));
  assert.equal(next.status, 'learning');
});

test('2回目以降の正答は interval × ease を四捨五入', () => {
  const next = applyReview({ ease_factor: 2.55, interval_days: 1 }, 'correct', TODAY);
  assert.equal(next.interval_days, 3); // round(1 * 2.55)
  assert.equal(next.ease_factor, 2.6);
  assert.equal(next.next_review_date, '2026-01-13');
});

test('ease_factor の上限は2.8', () => {
  const next = applyReview({ ease_factor: 2.8, interval_days: 5 }, 'correct', TODAY);
  assert.equal(next.ease_factor, 2.8);
});

test('誤答で interval は0、次回復習日は本日、ease は-0.2', () => {
  const next = applyReview({ ease_factor: 2.5, interval_days: 10 }, 'incorrect', TODAY);
  assert.equal(next.interval_days, 0);
  assert.equal(next.ease_factor, 2.3);
  assert.equal(next.next_review_date, TODAY);
  assert.equal(next.status, 'learning');
});

test('ease_factor の下限は1.3', () => {
  const next = applyReview({ ease_factor: 1.35, interval_days: 3 }, 'incorrect', TODAY);
  assert.equal(next.ease_factor, 1.3);
});

test('interval が21日以上で mastered', () => {
  const next = applyReview({ ease_factor: 2.5, interval_days: 9 }, 'correct', TODAY);
  assert.equal(next.interval_days, 23);
  assert.equal(next.status, 'mastered');
  assert.equal(statusFor(20), 'learning');
  assert.equal(statusFor(21), 'mastered');
  assert.equal(statusFor(0, { reviewed: false }), 'new');
});

test('月をまたぐ日付計算', () => {
  assert.equal(addDays('2026-01-30', 3), '2026-02-02');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
});
