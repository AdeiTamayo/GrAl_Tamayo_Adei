const pool = require('../config/database');

exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.userId;

        // Total workout count
        const workoutCountResult = await pool.query(
            `SELECT COUNT(*)::int AS count FROM workouts WHERE user_id = $1`,
            [userId]
        );
        const workoutCount = workoutCountResult.rows[0].count;

        // Weekly volume (sum of weight * reps for sets in the current ISO week)
        const weeklyVolumeResult = await pool.query(
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
        const weeklyVolume = Math.round(weeklyVolumeResult.rows[0].volume);

        // Current streak: consecutive ISO weeks with at least one workout
        const weeksResult = await pool.query(
            `SELECT DISTINCT date_trunc('week', date) AS week_start
             FROM workouts
             WHERE user_id = $1
             ORDER BY week_start DESC`,
            [userId]
        );

        let streak = 0;
        if (weeksResult.rows.length > 0) {
            const now = new Date();
            const currentWeekStart = new Date(now);
            currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            currentWeekStart.setHours(0, 0, 0, 0);

            const mostRecentWeek = new Date(weeksResult.rows[0].week_start);
            const diffMs = currentWeekStart.getTime() - mostRecentWeek.getTime();
            const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

            // If the most recent workout is within the current or previous week, start counting
            if (diffWeeks <= 1) {
                streak = 1;
                for (let i = 1; i < weeksResult.rows.length; i++) {
                    const prevWeek = new Date(weeksResult.rows[i - 1].week_start);
                    const curWeek = new Date(weeksResult.rows[i].week_start);
                    const weekDiff = (prevWeek.getTime() - curWeek.getTime()) / (7 * 24 * 60 * 60 * 1000);
                    if (Math.round(weekDiff) === 1) {
                        streak++;
                    } else {
                        break;
                    }
                }
            }
        }

        res.json({
            success: true,
            data: {
                workoutCount,
                weeklyVolume,
                currentStreak: streak
            }
        });
    } catch (error) {
        console.error('[Dashboard Controller] Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to load dashboard stats' });
    }
};
