-- Personal records per user and exercise
CREATE TABLE IF NOT EXISTS pr (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    exercise_id INTEGER      NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    weight      DECIMAL(5,2) NOT NULL,
    repetitions INTEGER      NOT NULL DEFAULT 1,
    date        DATE         NOT NULL DEFAULT CURRENT_DATE, 
    note        VARCHAR(255)
);
