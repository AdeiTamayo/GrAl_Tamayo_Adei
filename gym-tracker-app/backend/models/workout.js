const pool = require('../config/database');

class Workout {
    // Get all workouts
    static async getWorkouts(userId) {
        try {
            const query = `
                SELECT * FROM workouts
                WHERE user_id = $1
                ORDER BY date DESC;
            `;
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('[Workout Model] Error fetching workouts:', error.message);
            throw error;
        }
    }

    // Get a specific workout by ID, including its associated exercises and sets
    static async getWorkoutById(id, userId) {
        try {
            const workoutQuery = `
                SELECT *
                FROM workouts
                WHERE id = $1 AND user_id = $2;
            `;
            const workoutResult = await pool.query(workoutQuery, [id, userId]);
            if (workoutResult.rows.length === 0) return null;

            const exercisesQuery = `
                SELECT
                    we.id AS workout_exercise_id,
                    we.exercise_id,
                    we.exercise_order,
                    we.note AS exercise_note,
                    e.name AS exercise_name,
                    s.id AS set_id,
                    s.set_number,
                    s.weight,
                    s.repetitions,
                    s.time AS set_time,
                    s.note AS set_note
                FROM workout_exercises we
                JOIN exercises e ON we.exercise_id = e.id
                LEFT JOIN sets s ON we.id = s.workout_exercise_id
                WHERE we.workout_id = $1
                ORDER BY we.exercise_order ASC, s.set_number ASC;
            `;
            const exercisesResult = await pool.query(exercisesQuery, [id]);

            const workout = workoutResult.rows[0];
            const exercisesMap = {};

            exercisesResult.rows.forEach((row) => {
                const note =
                    (row.exercise_note && String(row.exercise_note).trim()) ||
                    null;

                if (!exercisesMap[row.workout_exercise_id]) {
                    exercisesMap[row.workout_exercise_id] = {
                        id: row.workout_exercise_id,
                        exercise_id: row.exercise_id,
                        exercise_order: row.exercise_order,
                        name: row.exercise_name,
                        note,
                        sets: []
                    };
                }

                if (row.set_id) {
                    exercisesMap[row.workout_exercise_id].sets.push({
                        id: row.set_id,
                        set_number: row.set_number,
                        weight: row.weight,
                        repetitions: row.repetitions,
                        time: row.set_time,
                        note: row.set_note
                    });
                }
            });

            workout.exercises = Object.values(exercisesMap);
            return workout;
        } catch (error) {
            console.error('[Workout Model] Error fetching workout by ID:', error.message);
            throw error;
        }
    }

    // Create a new workout
    static async createWorkout(userId, name, date, note) {
        try {
            const workoutDate = date || new Date().toISOString().split('T')[0];

            const query = `
                INSERT INTO workouts (user_id, name, date, note)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const result = await pool.query(query, [userId, name, workoutDate, note]);
            return result.rows[0];
        } catch (error) {
            console.error('[Workout Model] Error creating workout:', error.message);
            throw error;
        }
    }

    // Update an existing workout
    static async updateWorkout(id, name, date, note) {
        try {
            const query = `
                UPDATE workouts
                SET name = $1, date = $2, note = $3
                WHERE id = $4
                RETURNING *;
            `;
            const result = await pool.query(query, [name, date, note, id]);
            return result.rows[0];
        } catch (error) {
            console.error('[Workout Model] Error updating workout:', error.message);
            throw error;
        }
    }

    // Delete a workout
    static async deleteWorkout(id, userId) {
        try {
            const query = `
                DELETE FROM workouts
                WHERE id = $1 AND user_id = $2
                RETURNING id;
            `;
            const result = await pool.query(query, [id, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Workout Model] Error deleting workout:', error.message);
            throw error;
        }
    }

    // Insert a new set into a workout
    static async addWorkoutExercise(workoutId, exerciseId, note = null) {
        try {
            const orderRes = await pool.query(
                `SELECT COALESCE(MAX(exercise_order), 0) + 1 AS next_order
                 FROM workout_exercises
                 WHERE workout_id = $1`,
                [workoutId]
            );

            const nextOrder = orderRes.rows[0].next_order;

            const query = `
                INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, note)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const result = await pool.query(query, [workoutId, exerciseId, nextOrder, note]);
            return result.rows[0];
        } catch (error) {
            console.error('[Workout Model] Error adding workout exercise:', error.message);
            throw error;
        }
    }

    static async deleteWorkoutExercise(workoutExerciseId, userId) {
        try {
            const query = `
                DELETE FROM workout_exercises we
                USING workouts w
                WHERE we.workout_id = w.id AND we.id = $1 AND w.user_id = $2
                RETURNING we.id;
            `;
            const result = await pool.query(query, [workoutExerciseId, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Workout Model] Error deleting workout exercise:', error.message);
            throw error;
        }
    }

    static async insertSet(workoutExerciseId, weight, reps, time, note) {
        try {
            const isMissing = (v) => v === null || v === undefined;
            if (isMissing(weight) && isMissing(reps) && isMissing(time)) {
                throw new Error('Cannot insert an empty set.');
            }

            const setNumRes = await pool.query(
                `SELECT COALESCE(MAX(set_number), 0) + 1 AS next_set
                 FROM sets
                 WHERE workout_exercise_id = $1`,
                [workoutExerciseId]
            );
            const setNumber = setNumRes.rows[0].next_set;

            const query = `
                INSERT INTO sets (workout_exercise_id, set_number, weight, repetitions, time, note)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `;
            const result = await pool.query(query, [
                workoutExerciseId,
                setNumber,
                weight,
                reps,
                time,
                note
            ]);
            return result.rows[0];
        } catch (error) {
            console.error('[Workout Model] Error inserting set:', error.message);
            throw error;
        }
    }

    // Update a specific set
    static async updateSet(setId, weight, reps, time) {
        try {
            const query = `
                UPDATE sets
                SET weight = $1, repetitions = $2, time = $3
                WHERE id = $4
                RETURNING *;
            `;
            const result = await pool.query(query, [weight, reps, time, setId]);
            return result.rows[0];
        } catch (error) {
            console.error('[Workout Model] Error updating set:', error.message);
            throw error;
        }
    }

    static async getExerciseIdForWorkoutExercise(workoutExerciseId, userId) {
        try {
            const query = `
                SELECT we.exercise_id
                FROM workout_exercises we
                JOIN workouts w ON we.workout_id = w.id
                WHERE we.id = $1 AND w.user_id = $2
            `;
            const result = await pool.query(query, [workoutExerciseId, userId]);
            return result.rows[0]?.exercise_id || null;
        } catch (error) {
            console.error('[Workout Model] Error fetching exercise_id:', error.message);
            throw error;
        }
    }

    static async deleteSet(setId, userId) {
        try {
            const query = `
                DELETE FROM sets s
                USING workout_exercises we, workouts w
                WHERE s.workout_exercise_id = we.id AND we.workout_id = w.id AND s.id = $1 AND w.user_id = $2
                RETURNING s.id;
            `;
            const result = await pool.query(query, [setId, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Workout Model] Error deleting set:', error.message);
            throw error;
        }
    }

}

module.exports = Workout;