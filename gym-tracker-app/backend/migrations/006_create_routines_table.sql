CREATE TABLE IF NOT EXISTS routines (
    id      SERIAL       PRIMARY KEY,
    user_id INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    VARCHAR(255),
    note    TEXT
);


CREATE TABLE IF NOT EXISTS routine_exercises (
    id             SERIAL  PRIMARY KEY,
    routine_id     INTEGER NOT NULL REFERENCES routines(id)  ON DELETE CASCADE,
    exercise_id    INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    exercise_order INTEGER NOT NULL,
    planned_sets   INTEGER,
    planned_reps   INTEGER,
    planned_weight DECIMAL(5,2),
    planned_time   INTEGER,
    note           TEXT
);

CREATE TABLE IF NOT EXISTS routine_sets (
    id                  SERIAL       PRIMARY KEY,
    routine_exercise_id INTEGER      NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
    set_number          INTEGER      NOT NULL,
    planned_weight      DECIMAL(5,2),
    planned_reps        INTEGER,
    planned_time        INTEGER
);
