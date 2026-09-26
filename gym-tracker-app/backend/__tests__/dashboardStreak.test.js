jest.mock('../config/database', () => {
  const { Pool } = require('pg');
  const pool = new Pool();
  pool.query = jest.fn();
  pool.connect = jest.fn();
  return pool;
});

const { calculateStreak, startOfIsoWeek } = require('../models/dashboard');

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Wednesday, so "this week" and "the Monday before it" are both unambiguous.
const NOW = new Date('2024-03-13T12:00:00Z');

// Weeks are worked out in local time (the same clock the user sees), so build
// the fixtures locally rather than from UTC instants.
function localMondayOf(date) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const THIS_MONDAY = localMondayOf(NOW);
const weeksAgo = (n) => new Date(THIS_MONDAY.getTime() - n * MS_PER_WEEK);

describe('startOfIsoWeek', () => {
  test('lands on a Monday at midnight, whatever the input day', () => {
    [NOW, new Date('2024-03-17T23:59:00'), new Date('2024-03-11T00:00:00')].forEach((input) => {
      const start = startOfIsoWeek(input);
      expect(start.getDay()).toBe(1);
      expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
    });
  });

  test('returns the same Monday for every day of that week', () => {
    const monday = startOfIsoWeek(THIS_MONDAY);
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(THIS_MONDAY.getTime() + offset * 24 * 60 * 60 * 1000);
      expect(startOfIsoWeek(day)).toEqual(monday);
    }
  });

  test('leaves a Monday at midnight unchanged', () => {
    expect(startOfIsoWeek(THIS_MONDAY)).toEqual(THIS_MONDAY);
  });
});

describe('calculateStreak', () => {
  test('is 0 with no workouts at all', () => {
    expect(calculateStreak([], NOW)).toBe(0);
  });

  test('is 1 for a single workout this week', () => {
    expect(calculateStreak([weeksAgo(0)], NOW)).toBe(1);
  });

  test('counts consecutive weeks', () => {
    expect(calculateStreak([weeksAgo(0), weeksAgo(1), weeksAgo(2)], NOW)).toBe(3);
  });

  test('keeps the streak alive when the current week is still empty', () => {
    // Last session was in the previous week, so the streak is still valid.
    expect(calculateStreak([weeksAgo(1), weeksAgo(2)], NOW)).toBe(2);
  });

  test('resets to 0 after a two-week gap', () => {
    expect(calculateStreak([weeksAgo(2), weeksAgo(3)], NOW)).toBe(0);
  });

  test('stops counting at the first gap', () => {
    // weeks 0,1 then a gap, then 3,4
    expect(calculateStreak([weeksAgo(0), weeksAgo(1), weeksAgo(3), weeksAgo(4)], NOW)).toBe(2);
  });

  test('ignores duplicate entries for the same week', () => {
    expect(calculateStreak([weeksAgo(0), weeksAgo(0)], NOW)).toBe(1);
  });
});
