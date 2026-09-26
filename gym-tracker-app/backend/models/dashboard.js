const pool = require('../config/database');

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Monday 00:00 of the week containing `date`, matching PostgreSQL's
 * `date_trunc('week', ...)` so the two agree on where a week starts.
 */
function startOfIsoWeek(date) {
    const start = new Date(date);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return start;
}

/**
 * How many consecutive weeks, counting back from the current one, contain at
 * least one workout. Weeks are the distinct `week_start` values newest-first.
 *
 * A gap of one week is tolerated: training in the current week keeps the streak
 * alive even if the previous week was skipped, as long as the week before that
 * was not.
 */
function calculateStreak(weekStarts, now = new Date()) {
    if (weekStarts.length === 0) return 0;

    const currentWeekStart = startOfIsoWeek(now);
    const mostRecentWeek = new Date(weekStarts[0]);
    const weeksSinceMostRecent = Math.round(
        (currentWeekStart.getTime() - mostRecentWeek.getTime()) / MS_PER_WEEK
    );

    if (weeksSinceMostRecent > 1) return 0;

    let streak = 1;
    for (let i = 1; i < weekStarts.length; i++) {
        const previous = new Date(weekStarts[i - 1]);
        const current = new Date(weekStarts[i]);
        const gap = Math.round((previous.getTime() - current.getTime()) / MS_PER_WEEK);
        if (gap !== 1) break;
        streak++;
    }
    return streak;
}

class Dashboard {
    static async getWorkoutCount(userId) {
        const result = await pool.query(
            `SELECT COUNT(*)::int AS count FROM workouts WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0].count;
    }

    /**
     * Total lifted volume (weight x reps) for the current ISO week.
     */
    static async getWeeklyVolume(userId) {
        const result = await pool.query(
            `SELECT COALESCE(SUM(s.weight * s.repetitions), 0)::float AS volume
             FROM workouts w
             JOIN workout_exercises we ON w.id = we.workout_id
             JOIN sets s ON we.id = s.workout_exercise_id
             WHERE w.user_id = $1
               AND w.date >= date_trunc('week', CURRENT_DATE)
               AND w.date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
               AND s.weight IS NOT NULL
               AND s.repetitions IS NOT NULL`,
            [userId]
        );
        return Math.round(result.rows[0].volume);
    }

    /**
     * Distinct week starts that contain a workout, newest first.
     */
    static async getWorkoutWeeks(userId) {
        const result = await pool.query(
            `SELECT DISTINCT date_trunc('week', date) AS week_start
             FROM workouts
             WHERE user_id = $1
             ORDER BY week_start DESC`,
            [userId]
        );
        return result.rows.map((row) => row.week_start);
    }

    static async getStats(userId) {
        const workoutCount = await Dashboard.getWorkoutCount(userId);
        const weeklyVolume = await Dashboard.getWeeklyVolume(userId);
        const weekStarts = await Dashboard.getWorkoutWeeks(userId);

        return {
            workoutCount,
            weeklyVolume,
            currentStreak: calculateStreak(weekStarts)
        };
    }
}

module.exports = Dashboard;
module.exports.calculateStreak = calculateStreak;
module.exports.startOfIsoWeek = startOfIsoWeek;
