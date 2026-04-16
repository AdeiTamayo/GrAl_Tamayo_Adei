-- Gender enum type
CREATE TYPE gender_type AS ENUM ('male', 'female', 'non-binary');

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255),
    surname         VARCHAR(255),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255)        NOT NULL,
    gender          gender_type,
    weight          DECIMAL(5,2),                    -- In kg
    height          DECIMAL(5,2),                    -- In cm
    birth_date      date
    );


-- Historical log of user body weight
CREATE TABLE IF NOT EXISTS weight_history (
    id      SERIAL       PRIMARY KEY,
    user_id INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight  DECIMAL(5,2) NOT NULL,
    date    DATE         NOT NULL DEFAULT CURRENT_DATE
);



