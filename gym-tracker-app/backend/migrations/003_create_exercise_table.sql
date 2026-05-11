CREATE TYPE equipment_type AS ENUM (
    'body weight', 'dumbbell', 'barbell', 'cable',
    'machine', 'kettlebell', 'resistance band', 'other', 'assisted', 'leverage machine', 'medicine ball', 'assisted (towel)', 'balance', 'rope',  'stability ball', 'ez barbell', 'body weight (with resistance band)', 'olympic barbell', 'weighted', 'sled machine', 'smith machine', 'wheel roller', 'trap bar', 'band', 'stepmill machine', 'roller', 'stationary bike', 'upper body ergometer', 'elliptical machine', 'bosu ball', 'dumbbell, exercise ball'
);

CREATE TYPE difficulty_type AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE category_type   AS ENUM ('strength', 'cardio', 'stretching', 'plyometrics', 'other', 'balance', 'rehabilitation', 'mobility', 'balance');

CREATE TABLE IF NOT EXISTS exercises (
    id              SERIAL          PRIMARY KEY,
    api_id          VARCHAR(100)    UNIQUE,              -- ID from ExerciseDB API
    name            VARCHAR(255)    NOT NULL,
    body_part       VARCHAR(100),                        
    target_muscle   VARCHAR(100),                        -- Primary muscle
    secondary_muscles VARCHAR(255)[],                    -- Array of secondary muscles
    equipment       equipment_type,
    difficulty      difficulty_type,
    category        category_type,
    description     TEXT,
    instructions    TEXT[],                              
    is_custom       BOOLEAN         NOT NULL DEFAULT FALSE  -- TRUE if created by a user, not obtained from the API
);

CREATE INDEX idx_exercises_name          ON exercises USING gin(to_tsvector('english', name));
CREATE INDEX idx_exercises_body_part     ON exercises(body_part);
CREATE INDEX idx_exercises_target_muscle ON exercises(target_muscle);
CREATE INDEX idx_exercises_equipment     ON exercises(equipment);

