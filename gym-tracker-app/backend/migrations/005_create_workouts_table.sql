CREATE TABLE IF NOT EXISTS workouts (
    id      SERIAL       PRIMARY KEY,
    user_id INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    VARCHAR(255),
    date    DATE         NOT NULL DEFAULT CURRENT_DATE,
    note    TEXT
);


-- Bridge between a workout and the exercises it contains
CREATE TABLE IF NOT EXISTS workout_exercises (
    id             SERIAL  PRIMARY KEY,
    workout_id     INTEGER NOT NULL REFERENCES workouts(id)  ON DELETE CASCADE,
    exercise_id    INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    exercise_order INTEGER NOT NULL,
    note           TEXT
);

