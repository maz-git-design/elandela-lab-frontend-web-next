/*
  # Add Lab Opening and Closing Hours

  1. Changes
    - Add `opening_hour` and `closing_hour` columns to activities table (labs)
    - These columns will store time in HH:MM format

  2. Notes
    - Times stored as time without time zone
    - Default hours are 08:00 to 18:00
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'opening_hour'
  ) THEN
    ALTER TABLE activities ADD COLUMN opening_hour time DEFAULT '08:00:00';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'closing_hour'
  ) THEN
    ALTER TABLE activities ADD COLUMN closing_hour time DEFAULT '18:00:00';
  END IF;
END $$;