/*
  # Add Correct Fake Data
  
  Adds test data with all required fields
*/

-- Academic Years
INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES
('2024-2025', '2024-09-01', '2025-06-30', true)
ON CONFLICT DO NOTHING;

-- Departments
INSERT INTO departments (name, code) VALUES
('Computer Science', 'CS'),
('Physics', 'PHY')
ON CONFLICT (code) DO NOTHING;

-- Roles
INSERT INTO roles (name, description) VALUES
('student', 'Student'),
('instructor', 'Instructor')
ON CONFLICT (name) DO NOTHING;

-- Equipment Categories  
INSERT INTO equipment_categories (name, description) VALUES
('Microscopes', 'Microscopes'),
('Computers', 'Computers')
ON CONFLICT (name) DO NOTHING;

-- Core data
DO $$
DECLARE
  ay_id uuid;
  dept_cs uuid;
BEGIN
  SELECT id INTO ay_id FROM academic_years WHERE is_current = true LIMIT 1;
  SELECT id INTO dept_cs FROM departments WHERE code = 'CS' LIMIT 1;

  -- Cohorts
  INSERT INTO cohorts (name, academic_year_id, department_id) VALUES
  ('CS 2024', ay_id, dept_cs)
  ON CONFLICT DO NOTHING;

  -- Activities with full timestamps
  INSERT INTO activities (
    name, 
    description, 
    department_id, 
    lab_code, 
    building, 
    room_number, 
    floor, 
    capacity_users, 
    lab_status,
    start_time,
    end_time
  ) VALUES
  (
    'Programming Lab', 
    'CS Lab', 
    dept_cs, 
    'LAB-CS-01', 
    'Building A', 
    '101', 
    1, 
    30, 
    'active', 
    CURRENT_DATE + TIME '08:00:00',
    CURRENT_DATE + TIME '17:00:00'
  ),
  (
    'Advanced Programming Lab', 
    'CS Advanced Lab', 
    dept_cs, 
    'LAB-CS-02', 
    'Building A', 
    '102', 
    1, 
    20, 
    'active', 
    CURRENT_DATE + TIME '09:00:00',
    CURRENT_DATE + TIME '18:00:00'
  )
  ON CONFLICT DO NOTHING;

  -- Equipment with code field
  INSERT INTO equipment (name, code, serial_number, category_id, status, location)
  SELECT
    'Microscope-' || s,
    'EQUIP-MSC-' || s,
    'MSC' || s,
    (SELECT id FROM equipment_categories WHERE name = 'Microscopes' LIMIT 1),
    'available',
    'Lab Room ' || s
  FROM generate_series(1, 5) s
  ON CONFLICT DO NOTHING;

  INSERT INTO equipment (name, code, serial_number, category_id, status, location)
  SELECT
    'Computer-' || s,
    'EQUIP-PC-' || s,
    'PC' || s,
    (SELECT id FROM equipment_categories WHERE name = 'Computers' LIMIT 1),
    'available',
    'Computer Lab'
  FROM generate_series(1, 15) s
  ON CONFLICT DO NOTHING;

END $$;

-- Attendance data (only if profiles exist)
DO $$
DECLARE
  profile_count INT;
  activity_id uuid;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT id INTO activity_id FROM activities LIMIT 1;
  
  IF profile_count > 0 AND activity_id IS NOT NULL THEN
    INSERT INTO attendance (user_id, activity_id, check_in, check_out, type, status)
    SELECT
      p.id,
      activity_id,
      CURRENT_TIMESTAMP - (d || ' days')::interval + '9 hours'::interval,
      CURRENT_TIMESTAMP - (d || ' days')::interval + '11 hours'::interval,
      'manual',
      'present'
    FROM profiles p
    CROSS JOIN generate_series(0, 30) d
    LIMIT 100
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Reservations (only if profiles and equipment exist)
DO $$
DECLARE
  profile_count INT;
  equipment_count INT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO equipment_count FROM equipment;
  
  IF profile_count > 0 AND equipment_count > 0 THEN
    INSERT INTO reservations (user_id, equipment_id, start_time, end_time, purpose, status)
    SELECT
      (SELECT id FROM profiles ORDER BY RANDOM() LIMIT 1),
      e.id,
      CURRENT_TIMESTAMP + (d || ' days')::interval + '10 hours'::interval,
      CURRENT_TIMESTAMP + (d || ' days')::interval + '12 hours'::interval,
      'Lab work',
      CASE WHEN d < 0 THEN 'completed' ELSE 'confirmed' END
    FROM equipment e
    CROSS JOIN generate_series(-15, 15) d
    WHERE e.status = 'available'
    LIMIT 50
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
