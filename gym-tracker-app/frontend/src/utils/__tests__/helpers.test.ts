import { formatTime, todayLocal, computeStreak } from '../helpers';

describe('formatTime', () => {
  test('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  test('formats seconds only', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  test('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  test('formats hours, minutes, and seconds', () => {
    expect(formatTime(3661)).toBe('01:01:01');
  });

  test('formats exactly one hour', () => {
    expect(formatTime(3600)).toBe('01:00:00');
  });

  test('formats large values', () => {
    expect(formatTime(7384)).toBe('02:03:04');
  });

  test('pads single-digit minutes under one hour', () => {
    expect(formatTime(59)).toBe('00:59');
    expect(formatTime(61)).toBe('01:01');
  });

  test('rolls a full day over to hours, not days', () => {
    expect(formatTime(86400)).toBe('24:00:00');
  });
});

describe('todayLocal', () => {
  test('formats a fixed date as YYYY-MM-DD', () => {
    expect(todayLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayLocal(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  test('pads month and day', () => {
    expect(todayLocal(new Date(2026, 8, 9))).toBe('2026-09-09');
  });
});

describe('computeStreak', () => {
  test('empty history yields 0', () => {
    expect(computeStreak([], '2026-09-28')).toBe(0);
  });

  test('three consecutive weeks yield 3', () => {
    expect(computeStreak(['2026-09-28', '2026-09-21', '2026-09-14'], '2026-09-28')).toBe(3);
  });

  test('latest week one behind still seeds the streak', () => {
    expect(computeStreak(['2026-09-21', '2026-09-14'], '2026-09-28')).toBe(2);
  });

  test('latest week two behind yields 0', () => {
    expect(computeStreak(['2026-09-14'], '2026-09-28')).toBe(0);
  });

  test('a broken chain stops at the gap', () => {
    expect(computeStreak(['2026-09-28', '2026-09-21', '2026-09-07'], '2026-09-28')).toBe(2);
  });

  test('a single current week yields 1', () => {
    expect(computeStreak(['2026-09-28'], '2026-09-28')).toBe(1);
  });
});
