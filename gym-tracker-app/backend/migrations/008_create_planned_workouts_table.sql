CREATE TABLE IF NOT EXISTS planned_workouts (
    id         SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       DATE         NOT NULL,
    routine_id INTEGER      REFERENCES routines(id) ON DELETE SET NULL,
    name       VARCHAR(255) NOT NULL,
    note       TEXT,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
