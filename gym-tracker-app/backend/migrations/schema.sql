-- =============================================================================
-- Gym Tracker - Complete Supabase schema (single source of truth)
-- -----------------------------------------------------------------------------
-- Run this file in: Supabase Dashboard -> SQL Editor
--
-- This file replaces the previous numbered migrations (001..011). It always
-- represents the CURRENT full schema. Future schema changes are edited here,
-- in place - do not create new migration files.
--
-- Re-runnable: enums are created idempotently, tables use IF NOT EXISTS,
-- policies are dropped before being recreated.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'non-binary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_type AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- users
-- Password is handled by Supabase Auth (auth.users); auth_id links the
-- profile row to the auth user.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255),
    surname         VARCHAR(255),
    email           VARCHAR(255) UNIQUE NOT NULL,
    gender          gender_type,
    weight          DECIMAL(5,2),                    -- In kg
    height          DECIMAL(5,2),                    -- In cm
    birth_date      date,
    auth_id         UUID UNIQUE
);

-- -----------------------------------------------------------------------------
-- weight_history - Historical log of user body weight
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weight_history (
    id      SERIAL       PRIMARY KEY,
    user_id INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight  DECIMAL(5,2) NOT NULL,
    date    DATE         NOT NULL DEFAULT CURRENT_DATE
);

-- -----------------------------------------------------------------------------
-- exercises - Shared catalog (ExerciseDB + user-created custom exercises)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercises (
    id              SERIAL          PRIMARY KEY,
    api_id          VARCHAR(100)    UNIQUE,              -- ID from ExerciseDB API
    name            VARCHAR(255)    NOT NULL,
    body_part       VARCHAR(100),
    target_muscle   VARCHAR(100),                        -- Primary muscle
    secondary_muscles VARCHAR(255)[],                    -- Array of secondary muscles
    equipment       VARCHAR(100),
    difficulty      difficulty_type,
    category        VARCHAR(100),
    description     TEXT,
    instructions    TEXT[],
    is_custom       BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE if created by a user
    created_by      INTEGER         REFERENCES users(id) ON DELETE SET NULL  -- Owner of a custom exercise
);

CREATE INDEX IF NOT EXISTS idx_exercises_name          ON exercises USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_exercises_body_part     ON exercises(body_part);
CREATE INDEX IF NOT EXISTS idx_exercises_target_muscle ON exercises(target_muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment     ON exercises(equipment);

-- -----------------------------------------------------------------------------
-- pr - Personal records per user and exercise
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pr (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    exercise_id INTEGER      NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    weight      DECIMAL(5,2) NOT NULL,
    repetitions INTEGER      NOT NULL DEFAULT 1,
    date        DATE         NOT NULL DEFAULT CURRENT_DATE,
    note        VARCHAR(255)
);

-- -----------------------------------------------------------------------------
-- workouts + workout_exercises + sets
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- routines + routine_exercises + routine_sets
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- goals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    target_weight DECIMAL(6,2),
    target_reps INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_date DATE
);

-- -----------------------------------------------------------------------------
-- planned_workouts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planned_workouts (
    id         SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       DATE         NOT NULL,
    routine_id INTEGER      REFERENCES routines(id) ON DELETE SET NULL,
    name       VARCHAR(255) NOT NULL,
    note       TEXT,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- user_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
    id                SERIAL       PRIMARY KEY,
    user_id           INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    show_rpe          BOOLEAN      NOT NULL DEFAULT true,
    show_1rm          BOOLEAN      NOT NULL DEFAULT true,
    show_goals        BOOLEAN      NOT NULL DEFAULT true,
    show_rest_time    BOOLEAN      NOT NULL DEFAULT true,
    default_rest_time INTEGER      NOT NULL DEFAULT 60
);

-- -----------------------------------------------------------------------------
-- videos - Processed video analysis records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename       VARCHAR(255),
    process_type   VARCHAR(100),
    processed_url  TEXT,
    status         VARCHAR(50)  NOT NULL DEFAULT 'completed',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Helper: integer profile id of the current Supabase Auth user
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.users WHERE auth_id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_sets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_workouts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;

-- users: only your own profile row
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
    FOR SELECT TO authenticated
    USING (auth_id = auth.uid());

DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
    FOR UPDATE TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS users_delete_own ON users;
CREATE POLICY users_delete_own ON users
    FOR DELETE TO authenticated
    USING (auth_id = auth.uid());

-- Tables with a direct user_id column
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['weight_history', 'pr', 'workouts', 'routines', 'goals', 'planned_workouts', 'user_settings', 'videos']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_own', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (user_id = public.current_user_id())', t || '_select_own', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_own', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (user_id = public.current_user_id())', t || '_insert_own', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_own', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (user_id = public.current_user_id()) WITH CHECK (user_id = public.current_user_id())', t || '_update_own', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_own', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (user_id = public.current_user_id())', t || '_delete_own', t);
    END LOOP;
END $$;

-- workout_exercises: owned through workouts
DROP POLICY IF EXISTS workout_exercises_select_own ON workout_exercises;
CREATE POLICY workout_exercises_select_own ON workout_exercises
    FOR SELECT TO authenticated
    USING (workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id()));

DROP POLICY IF EXISTS workout_exercises_insert_own ON workout_exercises;
CREATE POLICY workout_exercises_insert_own ON workout_exercises
    FOR INSERT TO authenticated
    WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id()));

DROP POLICY IF EXISTS workout_exercises_update_own ON workout_exercises;
CREATE POLICY workout_exercises_update_own ON workout_exercises
    FOR UPDATE TO authenticated
    USING (workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id()))
    WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id()));

DROP POLICY IF EXISTS workout_exercises_delete_own ON workout_exercises;
CREATE POLICY workout_exercises_delete_own ON workout_exercises
    FOR DELETE TO authenticated
    USING (workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id()));

-- sets: owned through workout_exercises -> workouts
DROP POLICY IF EXISTS sets_select_own ON sets;
CREATE POLICY sets_select_own ON sets
    FOR SELECT TO authenticated
    USING (workout_exercise_id IN (
        SELECT id FROM workout_exercises
        WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id())
    ));

DROP POLICY IF EXISTS sets_insert_own ON sets;
CREATE POLICY sets_insert_own ON sets
    FOR INSERT TO authenticated
    WITH CHECK (workout_exercise_id IN (
        SELECT id FROM workout_exercises
        WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id())
    ));

DROP POLICY IF EXISTS sets_update_own ON sets;
CREATE POLICY sets_update_own ON sets
    FOR UPDATE TO authenticated
    USING (workout_exercise_id IN (
        SELECT id FROM workout_exercises
        WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id())
    ))
    WITH CHECK (workout_exercise_id IN (
        SELECT id FROM workout_exercises
        WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id())
    ));

DROP POLICY IF EXISTS sets_delete_own ON sets;
CREATE POLICY sets_delete_own ON sets
    FOR DELETE TO authenticated
    USING (workout_exercise_id IN (
        SELECT id FROM workout_exercises
        WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = public.current_user_id())
    ));

-- routine_exercises: owned through routines
DROP POLICY IF EXISTS routine_exercises_select_own ON routine_exercises;
CREATE POLICY routine_exercises_select_own ON routine_exercises
    FOR SELECT TO authenticated
    USING (routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id()));

DROP POLICY IF EXISTS routine_exercises_insert_own ON routine_exercises;
CREATE POLICY routine_exercises_insert_own ON routine_exercises
    FOR INSERT TO authenticated
    WITH CHECK (routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id()));

DROP POLICY IF EXISTS routine_exercises_update_own ON routine_exercises;
CREATE POLICY routine_exercises_update_own ON routine_exercises
    FOR UPDATE TO authenticated
    USING (routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id()))
    WITH CHECK (routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id()));

DROP POLICY IF EXISTS routine_exercises_delete_own ON routine_exercises;
CREATE POLICY routine_exercises_delete_own ON routine_exercises
    FOR DELETE TO authenticated
    USING (routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id()));

-- routine_sets: owned through routine_exercises -> routines
DROP POLICY IF EXISTS routine_sets_select_own ON routine_sets;
CREATE POLICY routine_sets_select_own ON routine_sets
    FOR SELECT TO authenticated
    USING (routine_exercise_id IN (
        SELECT id FROM routine_exercises
        WHERE routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id())
    ));

DROP POLICY IF EXISTS routine_sets_insert_own ON routine_sets;
CREATE POLICY routine_sets_insert_own ON routine_sets
    FOR INSERT TO authenticated
    WITH CHECK (routine_exercise_id IN (
        SELECT id FROM routine_exercises
        WHERE routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id())
    ));

DROP POLICY IF EXISTS routine_sets_update_own ON routine_sets;
CREATE POLICY routine_sets_update_own ON routine_sets
    FOR UPDATE TO authenticated
    USING (routine_exercise_id IN (
        SELECT id FROM routine_exercises
        WHERE routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id())
    ))
    WITH CHECK (routine_exercise_id IN (
        SELECT id FROM routine_exercises
        WHERE routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id())
    ));

DROP POLICY IF EXISTS routine_sets_delete_own ON routine_sets;
CREATE POLICY routine_sets_delete_own ON routine_sets
    FOR DELETE TO authenticated
    USING (routine_exercise_id IN (
        SELECT id FROM routine_exercises
        WHERE routine_id IN (SELECT id FROM routines WHERE user_id = public.current_user_id())
    ));

-- exercises: any authenticated user can read the catalog;
-- only the creator can write/delete their custom exercises
DROP POLICY IF EXISTS exercises_select_authenticated ON exercises;
CREATE POLICY exercises_select_authenticated ON exercises
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS exercises_insert_own_custom ON exercises;
CREATE POLICY exercises_insert_own_custom ON exercises
    FOR INSERT TO authenticated
    WITH CHECK (is_custom = true AND created_by = public.current_user_id());

DROP POLICY IF EXISTS exercises_update_own_custom ON exercises;
CREATE POLICY exercises_update_own_custom ON exercises
    FOR UPDATE TO authenticated
    USING (is_custom = true AND created_by = public.current_user_id());

DROP POLICY IF EXISTS exercises_delete_own_custom ON exercises;
CREATE POLICY exercises_delete_own_custom ON exercises
    FOR DELETE TO authenticated
    USING (is_custom = true AND created_by = public.current_user_id());

-- -----------------------------------------------------------------------------
-- Storage buckets for video analysis
--   uploads   = private raw videos (owners only)
--   processed = public analysed videos (readable by everyone)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false),
       ('processed', 'processed', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS uploads_select_own ON storage.objects;
CREATE POLICY uploads_select_own ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'uploads' AND owner_id = auth.uid());

DROP POLICY IF EXISTS uploads_insert_own ON storage.objects;
CREATE POLICY uploads_insert_own ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'uploads' AND owner_id = auth.uid());

DROP POLICY IF EXISTS uploads_update_own ON storage.objects;
CREATE POLICY uploads_update_own ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'uploads' AND owner_id = auth.uid());

DROP POLICY IF EXISTS uploads_delete_own ON storage.objects;
CREATE POLICY uploads_delete_own ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'uploads' AND owner_id = auth.uid());

DROP POLICY IF EXISTS processed_select_public ON storage.objects;
CREATE POLICY processed_select_public ON storage.objects
    FOR SELECT TO authenticated, anon
    USING (bucket_id = 'processed');

DROP POLICY IF EXISTS processed_insert_own ON storage.objects;
CREATE POLICY processed_insert_own ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'processed' AND owner_id = auth.uid());

DROP POLICY IF EXISTS processed_update_own ON storage.objects;
CREATE POLICY processed_update_own ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'processed' AND owner_id = auth.uid());

DROP POLICY IF EXISTS processed_delete_own ON storage.objects;
CREATE POLICY processed_delete_own ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'processed' AND owner_id = auth.uid());
