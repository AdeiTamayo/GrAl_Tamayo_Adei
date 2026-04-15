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
    static async getWorkoutById(id) {
        try {
            const workoutQuery = `
                SELECT * FROM workouts
                WHERE id = $1;
            `;
            const workoutResult = await pool.query(workoutQuery, [id]);

            if (workoutResult.rows.length === 0) return null;

            // Fetch the exercises and their sets for this workout
            const exercisesQuery = `
                SELECT 
                    we.id AS workout_exercise_id,
                    we.exercise_id,
                    we.exercise_order,
                    we.note AS exercise_note,
                    s.id AS set_id,
                    s.set_number,
                    s.weight,
                    s.repetitions,
                    s.note AS set_note
                FROM workout_exercises we
                LEFT JOIN sets s ON we.id = s.workout_exercise_id
                WHERE we.workout_id = $1
                ORDER BY we.exercise_order ASC, s.set_number ASC;
            `;
            const exercisesResult = await pool.query(exercisesQuery, [id]);

            const workout = workoutResult.rows[0];

            // Format the result to group sets inside their respective exercise
            const exercisesMap = {};
            exercisesResult.rows.forEach(row => {
                if (!exercisesMap[row.workout_exercise_id]) {
                    exercisesMap[row.workout_exercise_id] = {
                        id: row.workout_exercise_id,
                        exercise_id: row.exercise_id,
                        exercise_order: row.exercise_order,
                        note: row.exercise_note,
                        sets: []
                    };
                }

                if (row.set_id) {
                    exercisesMap[row.workout_exercise_id].sets.push({
                        id: row.set_id,
                        set_number: row.set_number,
                        weight: row.weight,
                        repetitions: row.repetitions,
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
    static async deleteWorkout(id) {
        try {
            const query = `
                DELETE FROM workouts
                WHERE id = $1
                RETURNING id;
            `;
            const result = await pool.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Workout Model] Error deleting workout:', error.message);
            throw error;
        }
    }

    // Insert a new set into a workout
    static async insertSet(workoutId, exerciseId, weight, reps) {
        try {
            // 1. Find or create the workout_exercise bridge entry
            let weQuery = `SELECT id FROM workout_exercises WHERE workout_id = $1 AND exercise_id = $2 LIMIT 1`;
            let weRes = await pool.query(weQuery, [workoutId, exerciseId]);
            let workoutExerciseId;

            if (weRes.rowCount === 0) {
                // Determine next exercise order
                let nextOrderRes = await pool.query(`SELECT COALESCE(MAX(exercise_order), 0) + 1 AS next_order FROM workout_exercises WHERE workout_id = $1`, [workoutId]);
                let nextOrder = nextOrderRes.rows[0].next_order;

                let insertWe = `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order) VALUES ($1, $2, $3) RETURNING id`;
                let insertWeRes = await pool.query(insertWe, [workoutId, exerciseId, nextOrder]);
                workoutExerciseId = insertWeRes.rows[0].id;
            } else {
                workoutExerciseId = weRes.rows[0].id;
            }

            // 2. Determine the set_number
            let setNumRes = await pool.query(`SELECT COALESCE(MAX(set_number), 0) + 1 AS next_set FROM sets WHERE workout_exercise_id = $1`, [workoutExerciseId]);
            let setNumber = setNumRes.rows[0].next_set;

            // 3. Insert the actual set
            const query = `
                INSERT INTO sets (workout_exercise_id, set_number, weight, repetitions)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const result = await pool.query(query, [workoutExerciseId, setNumber, weight, reps]);
            return result.rows[0];
        } catch (error) {
            console.error('[Workout Model] Error inserting set:', error.message);
            throw error;
        }
    }

    // Update a specific set
    static async updateSet(setId, weight, reps) {
        try {
            const query = `
                UPDATE sets
                SET weight = $1, repetitions = $2
                WHERE id = $3
                RETURNING *;
            `;
            const result = await pool.query(query, [weight, reps, setId]);
            return result.rows[0];
        } catch (error) {
            console.error('[Workout Model] Error updating set:', error.message);
            throw error;
        }
    }

    // Delete a specific set
    static async deleteSet(setId) {
        try {
            const query = `
                DELETE FROM sets
                WHERE id = $1
                RETURNING id;
            `;
            const result = await pool.query(query, [setId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Workout Model] Error deleting set:', error.message);
            throw error;
        }
    }
}

module.exports = Workout;