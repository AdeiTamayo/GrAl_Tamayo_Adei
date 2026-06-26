ALTER TABLE exercises
  ALTER COLUMN equipment TYPE VARCHAR(100) USING equipment::text,
  ALTER COLUMN category   TYPE VARCHAR(100) USING category::text;
