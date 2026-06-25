CREATE TABLE IF NOT EXISTS user_settings (
    id               SERIAL       PRIMARY KEY,
    user_id          INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    show_rpe         BOOLEAN      NOT NULL DEFAULT true,
    show_1rm         BOOLEAN      NOT NULL DEFAULT true,
    default_rest_time INTEGER     NOT NULL DEFAULT 60
);
