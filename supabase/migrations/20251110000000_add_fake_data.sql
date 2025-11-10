/*
  # Add Fake Data for Testing

  1. Data Additions
    - Academic Years (3 years)
    - Departments (5 departments)
    - Cohorts (10 cohorts)
    - Activities (15 activities)
    - Equipment Categories (8 categories)
    - Equipment (30 items)
    - Sample Attendances (100 records)
    - Sample Reservations (50 records)
*/

-- Academic Years
INSERT INTO academic_years (starting_year, ending_year, status) VALUES
(2022, 2023, 'archived'),
(2023, 2024, 'archived'),
(2024, 2025, 'active'),
(2025, 2026, 'upcoming')
ON CONFLICT DO NOTHING;

-- Departments
INSERT INTO departments (name, code, description, contact_email, contact_phone) VALUES
('Computer Science', 'CS', 'Department of Computer Science and Information Technology', 'cs@university.edu', '+1234567890'),
('Physics', 'PHY', 'Department of Physics and Applied Sciences', 'physics@university.edu', '+1234567891'),
('Biology', 'BIO', 'Department of Biological Sciences', 'biology@university.edu', '+1234567892'),
('Chemistry', 'CHEM', 'Department of Chemistry', 'chemistry@university.edu', '+1234567893'),
('Engineering', 'ENG', 'Department of Engineering', 'engineering@university.edu', '+1234567894')
ON CONFLICT DO NOTHING;

-- Get IDs for use in subsequent inserts
DO $$
DECLARE
  ay_2024 uuid;
  ay_2023 uuid;
  dept_cs uuid;
  dept_phy uuid;
  dept_bio uuid;
  dept_chem uuid;
  dept_eng uuid;
BEGIN
  SELECT id INTO ay_2024 FROM academic_years WHERE starting_year = 2024 LIMIT 1;
  SELECT id INTO ay_2023 FROM academic_years WHERE starting_year = 2023 LIMIT 1;
  SELECT id INTO dept_cs FROM departments WHERE code = 'CS' LIMIT 1;
  SELECT id INTO dept_phy FROM departments WHERE code = 'PHY' LIMIT 1;
  SELECT id INTO dept_bio FROM departments WHERE code = 'BIO' LIMIT 1;
  SELECT id INTO dept_chem FROM departments WHERE code = 'CHEM' LIMIT 1;
  SELECT id INTO dept_eng FROM departments WHERE code = 'ENG' LIMIT 1;

  -- Cohorts
  INSERT INTO cohorts (name, academic_year_id, department_id, description) VALUES
  ('CS 2024 A', ay_2024, dept_cs, 'Computer Science cohort 2024 section A'),
  ('CS 2024 B', ay_2024, dept_cs, 'Computer Science cohort 2024 section B'),
  ('PHY 2024', ay_2024, dept_phy, 'Physics cohort 2024'),
  ('BIO 2024 A', ay_2024, dept_bio, 'Biology cohort 2024 section A'),
  ('BIO 2024 B', ay_2024, dept_bio, 'Biology cohort 2024 section B'),
  ('CHEM 2024', ay_2024, dept_chem, 'Chemistry cohort 2024'),
  ('ENG 2024', ay_2024, dept_eng, 'Engineering cohort 2024'),
  ('CS 2023', ay_2023, dept_cs, 'Computer Science cohort 2023'),
  ('PHY 2023', ay_2023, dept_phy, 'Physics cohort 2023'),
  ('BIO 2023', ay_2023, dept_bio, 'Biology cohort 2023')
  ON CONFLICT DO NOTHING;

  -- Activities
  INSERT INTO activities (name, description, cohort_id, is_active)
  SELECT
    'Programming Lab - ' || c.name,
    'Hands-on programming and software development',
    c.id,
    true
  FROM cohorts c WHERE c.name LIKE 'CS%'
  ON CONFLICT DO NOTHING;

  INSERT INTO activities (name, description, cohort_id, is_active)
  SELECT
    'Physics Lab - ' || c.name,
    'Experimental physics and measurements',
    c.id,
    true
  FROM cohorts c WHERE c.name LIKE 'PHY%'
  ON CONFLICT DO NOTHING;

  INSERT INTO activities (name, description, cohort_id, is_active)
  SELECT
    'Biology Lab - ' || c.name,
    'Microbiology and cellular studies',
    c.id,
    true
  FROM cohorts c WHERE c.name LIKE 'BIO%'
  ON CONFLICT DO NOTHING;

  INSERT INTO activities (name, description, cohort_id, is_active)
  SELECT
    'Chemistry Lab - ' || c.name,
    'Chemical reactions and analysis',
    c.id,
    true
  FROM cohorts c WHERE c.name LIKE 'CHEM%'
  ON CONFLICT DO NOTHING;

  -- Equipment Categories
  INSERT INTO equipment_categories (name, description) VALUES
  ('Microscopes', 'Various types of microscopes for observation'),
  ('Computers', 'Desktop and laptop computers'),
  ('Lab Equipment', 'General laboratory equipment'),
  ('Measurement Tools', 'Precision measurement instruments'),
  ('Safety Equipment', 'Lab safety gear and equipment'),
  ('Glassware', 'Laboratory glassware and containers'),
  ('Electronics', 'Electronic components and devices'),
  ('Software Licenses', 'Software and development tools')
  ON CONFLICT DO NOTHING;

  -- Equipment
  INSERT INTO equipment (name, serial_number, category_id, status, location, acquisition_date)
  SELECT
    'Microscope ' || generate_series,
    'MSC-2024-' || LPAD(generate_series::text, 4, '0'),
    (SELECT id FROM equipment_categories WHERE name = 'Microscopes' LIMIT 1),
    CASE WHEN generate_series % 5 = 0 THEN 'maintenance' ELSE 'available' END,
    'Lab Room ' || (generate_series % 5 + 1),
    CURRENT_DATE - (generate_series || ' days')::interval
  FROM generate_series(1, 10)
  ON CONFLICT DO NOTHING;

  INSERT INTO equipment (name, serial_number, category_id, status, location, acquisition_date)
  SELECT
    'Computer Station ' || generate_series,
    'PC-2024-' || LPAD(generate_series::text, 4, '0'),
    (SELECT id FROM equipment_categories WHERE name = 'Computers' LIMIT 1),
    'available',
    'Computer Lab ' || (generate_series % 3 + 1),
    CURRENT_DATE - (generate_series * 10 || ' days')::interval
  FROM generate_series(1, 15)
  ON CONFLICT DO NOTHING;

  INSERT INTO equipment (name, serial_number, category_id, status, location, acquisition_date)
  SELECT
    'Oscilloscope ' || generate_series,
    'OSC-2024-' || LPAD(generate_series::text, 4, '0'),
    (SELECT id FROM equipment_categories WHERE name = 'Electronics' LIMIT 1),
    'available',
    'Electronics Lab',
    CURRENT_DATE - (generate_series * 5 || ' days')::interval
  FROM generate_series(1, 5)
  ON CONFLICT DO NOTHING;

END $$;

-- Add sample attendances (last 90 days)
DO $$
DECLARE
  activity_rec RECORD;
  day_offset INT;
  hour_offset INT;
BEGIN
  FOR activity_rec IN SELECT id FROM activities LIMIT 5 LOOP
    FOR day_offset IN 0..89 LOOP
      FOR hour_offset IN 0..2 LOOP
        INSERT INTO attendances (
          user_id,
          activity_id,
          check_in_time,
          check_out_time,
          status
        ) VALUES (
          (SELECT id FROM profiles ORDER BY RANDOM() LIMIT 1),
          activity_rec.id,
          CURRENT_TIMESTAMP - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval,
          CURRENT_TIMESTAMP - (day_offset || ' days')::interval + ((hour_offset + 2) || ' hours')::interval,
          CASE
            WHEN RANDOM() > 0.9 THEN 'absent'
            WHEN RANDOM() > 0.8 THEN 'late'
            ELSE 'present'
          END
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Add sample reservations (last 60 days and future 30 days)
DO $$
DECLARE
  equipment_rec RECORD;
  day_offset INT;
BEGIN
  FOR equipment_rec IN SELECT id FROM equipment WHERE status = 'available' LIMIT 10 LOOP
    FOR day_offset IN -60..30 LOOP
      INSERT INTO reservations (
        user_id,
        equipment_id,
        start_time,
        end_time,
        purpose,
        status
      ) VALUES (
        (SELECT id FROM profiles ORDER BY RANDOM() LIMIT 1),
        equipment_rec.id,
        CURRENT_TIMESTAMP + (day_offset || ' days')::interval + '9 hours'::interval,
        CURRENT_TIMESTAMP + (day_offset || ' days')::interval + '11 hours'::interval,
        'Lab research and experiments',
        CASE
          WHEN day_offset < 0 THEN 'completed'
          WHEN day_offset = 0 THEN 'confirmed'
          WHEN RANDOM() > 0.7 THEN 'pending'
          ELSE 'confirmed'
        END
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
