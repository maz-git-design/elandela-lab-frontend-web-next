/*
  # Add More Test Data for Analytics Charts
  
  1. Purpose
    - Add more attendance and reservation records across different time periods
    - Ensure data spans multiple months for meaningful chart visualization
    - Add varied statuses for filter testing
    
  2. Data Added
    - 100+ attendance records across 6 months
    - 100+ reservation records across 6 months
    - Multiple statuses (present, late, absent for attendance)
    - Multiple statuses (pending, confirmed, cancelled for reservations)
    
  3. Notes
    - Uses existing user and equipment IDs
    - Distributed across time for trend analysis
*/

DO $$
DECLARE
  v_user_ids uuid[];
  v_activity_ids uuid[];
  v_equipment_ids uuid[];
  v_user_id uuid;
  v_activity_id uuid;
  v_equipment_id uuid;
  v_month_offset int;
  v_day int;
  v_date timestamptz;
  v_statuses text[] := ARRAY['present', 'late', 'absent'];
  v_res_statuses text[] := ARRAY['pending', 'confirmed', 'cancelled', 'completed'];
BEGIN
  SELECT ARRAY_AGG(id) INTO v_user_ids FROM profiles LIMIT 10;
  SELECT ARRAY_AGG(id) INTO v_activity_ids FROM activities LIMIT 5;
  SELECT ARRAY_AGG(id) INTO v_equipment_ids FROM equipment LIMIT 10;

  IF array_length(v_user_ids, 1) IS NULL OR array_length(v_activity_ids, 1) IS NULL THEN
    RAISE NOTICE 'Not enough data to create test records';
    RETURN;
  END IF;

  FOR v_month_offset IN 0..5 LOOP
    FOR v_day IN 1..20 LOOP
      v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];
      v_activity_id := v_activity_ids[1 + floor(random() * array_length(v_activity_ids, 1))::int];
      v_date := NOW() - (v_month_offset || ' months')::interval - (v_day || ' days')::interval + (floor(random() * 8 + 8) || ' hours')::interval;

      INSERT INTO attendance (user_id, activity_id, check_in, status, type)
      VALUES (
        v_user_id,
        v_activity_id,
        v_date,
        v_statuses[1 + floor(random() * 3)::int],
        CASE floor(random() * 3)::int
          WHEN 0 THEN 'manual'
          WHEN 1 THEN 'face'
          ELSE 'qr'
        END
      )
      ON CONFLICT DO NOTHING;

      IF array_length(v_equipment_ids, 1) > 0 THEN
        v_equipment_id := v_equipment_ids[1 + floor(random() * array_length(v_equipment_ids, 1))::int];
        
        INSERT INTO reservations (user_id, equipment_id, start_time, end_time, status, purpose)
        VALUES (
          v_user_id,
          v_equipment_id,
          v_date,
          v_date + (floor(random() * 3 + 1) || ' hours')::interval,
          v_res_statuses[1 + floor(random() * 4)::int],
          'Test reservation for analytics'
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Test data added successfully';
END $$;
