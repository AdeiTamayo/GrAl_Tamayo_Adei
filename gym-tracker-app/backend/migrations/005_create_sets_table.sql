CREATE TABLE IF NOT EXISTS sets (
    id                  SERIAL       PRIMARY KEY,
    workout_exercise_id INTEGER      NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number          INTEGER      NOT NULL,
    weight              DECIMAL(5,2),
    repetitions         INTEGER,
    note                VARCHAR(255), 
    time                INTEGER, 
    rpe                 DECIMAL(3,1)
);

