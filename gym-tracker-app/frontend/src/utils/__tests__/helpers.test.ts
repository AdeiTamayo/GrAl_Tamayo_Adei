import { formatTime } from '../helpers';

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
});
