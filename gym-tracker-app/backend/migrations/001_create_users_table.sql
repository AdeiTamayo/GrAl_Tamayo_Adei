CREATE TABLE IF NOT EXISTS genders (
    id   SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

INSERT INTO genders (name) VALUES ('male'), ('female'), ('non-binary');

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255)        NOT NULL,
    surname         VARCHAR(255)        NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255)        NOT NULL,
    gender_id       INT                 REFERENCES genders(id),
    weight          DECIMAL(5,2),                    -- In kg
    height          DECIMAL(5,2),                    -- In cm
    birth_date      DATE,                            
    profile_picture VARCHAR(255),                    -- The URL to the image

    -- TODO: Implement the recovery tokens
    -- reset_token     VARCHAR(255),           
    -- reset_token_expires_at   TIMESTAMP,             
);



COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.password IS 'Hashed password using bcrypt';
COMMENT ON COLUMN users.birth_date IS 'Used to calculate age dynamically';
COMMENT ON COLUMN genders.id IS 'Foreign key reference used in the users table';


-- TODO: Implement the recovery tokens
-- COMMENT ON COLUMN users.reset_token IS 'Time-limited token for password recovery';
-- COMMENT ON COLUMN users.reset_token_expires_at IS 'Expiry timestamp for the reset token';