/*
  # Restructure Reservations and Attendance Tables V3
  
  1. Purpose
    - Restructure reservations table to support request/approval workflow
    - Add support for group reservations and lecturer use
    - Add availability checking
    - Add manager decision tracking
    - Link attendance to reservations
    
  2. Changes Made
    - Create junction tables for many-to-many relationships
    - Add workflow fields to reservations
    - Update attendance to link with reservations
    - Add proper RLS policies
    
  3. Security
    - Enable RLS on all new tables
    - Users can view/create their own reservations
    - Admins/managers can view and manage all reservations
*/

-- Create new reservation_activities junction table (for labs/sessions)
CREATE TABLE IF NOT EXISTS reservation_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reservation_id, activity_id)
);

-- Create new reservation_equipment junction table
CREATE TABLE IF NOT EXISTS reservation_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reservation_id, equipment_id)
);

-- Create reservation_group_members junction table
CREATE TABLE IF NOT EXISTS reservation_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reservation_id, user_id)
);

-- Create reservation_history table
CREATE TABLE IF NOT EXISTS reservation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by uuid REFERENCES profiles(id),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Create reservation_comments table
CREATE TABLE IF NOT EXISTS reservation_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  commenter_id uuid NOT NULL REFERENCES profiles(id),
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to reservations table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'requested_at') THEN
    ALTER TABLE reservations ADD COLUMN requested_at timestamptz DEFAULT now();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'start_time') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'desired_start_time') THEN
    ALTER TABLE reservations RENAME COLUMN start_time TO desired_start_time;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'end_time') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'desired_end_time') THEN
    ALTER TABLE reservations RENAME COLUMN end_time TO desired_end_time;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'manager_id') THEN
    ALTER TABLE reservations ADD COLUMN manager_id uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'manager_decision_at') THEN
    ALTER TABLE reservations ADD COLUMN manager_decision_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'manager_comments') THEN
    ALTER TABLE reservations ADD COLUMN manager_comments text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'alternative_start_time') THEN
    ALTER TABLE reservations ADD COLUMN alternative_start_time timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'alternative_end_time') THEN
    ALTER TABLE reservations ADD COLUMN alternative_end_time timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'alternative_activity_id') THEN
    ALTER TABLE reservations ADD COLUMN alternative_activity_id uuid REFERENCES activities(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'priority') THEN
    ALTER TABLE reservations ADD COLUMN priority text DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'reservation_type') THEN
    ALTER TABLE reservations ADD COLUMN reservation_type text DEFAULT 'individual';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'requester_role') THEN
    ALTER TABLE reservations ADD COLUMN requester_role text DEFAULT 'student';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'motivation') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'purpose') THEN
      ALTER TABLE reservations RENAME COLUMN purpose TO motivation;
    ELSE
      ALTER TABLE reservations ADD COLUMN motivation text;
    END IF;
  END IF;
END $$;

-- Migrate existing equipment_id to junction table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, equipment_id FROM reservations WHERE equipment_id IS NOT NULL
  LOOP
    INSERT INTO reservation_equipment (reservation_id, equipment_id)
    VALUES (r.id, r.equipment_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Add constraints
DO $$
BEGIN
  ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
  ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'suggested', 'cancelled', 'confirmed', 'completed'));

  ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_priority_check;
  ALTER TABLE reservations ADD CONSTRAINT reservations_priority_check 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

  ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_type_check;
  ALTER TABLE reservations ADD CONSTRAINT reservations_type_check 
    CHECK (reservation_type IN ('individual', 'group', 'lecturerUse'));

  ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_requester_role_check;
  ALTER TABLE reservations ADD CONSTRAINT reservations_requester_role_check 
    CHECK (requester_role IN ('student', 'lecturer', 'staff'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Update attendance table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'reservation_id') THEN
    ALTER TABLE attendance ADD COLUMN reservation_id uuid REFERENCES reservations(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'confirmed_at') THEN
    ALTER TABLE attendance ADD COLUMN confirmed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'confirmed_by') THEN
    ALTER TABLE attendance ADD COLUMN confirmed_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'comments') THEN
    ALTER TABLE attendance ADD COLUMN comments text;
  END IF;
END $$;

-- Update attendance status constraint
DO $$
BEGIN
  ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
  ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
    CHECK (status IN ('present', 'absent', 'late', 'left_early'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Enable RLS on new tables
ALTER TABLE reservation_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_comments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = user_id AND r.name IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for reservation_activities
CREATE POLICY "Users can view their reservation activities"
  ON reservation_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_activities.reservation_id 
      AND reservations.user_id = auth.uid()
    ) OR is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can insert reservation activities"
  ON reservation_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_activities.reservation_id 
      AND reservations.user_id = auth.uid()
    )
  );

-- Policies for reservation_equipment
CREATE POLICY "Users can view their reservation equipment"
  ON reservation_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_equipment.reservation_id 
      AND reservations.user_id = auth.uid()
    ) OR is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can insert reservation equipment"
  ON reservation_equipment FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_equipment.reservation_id 
      AND reservations.user_id = auth.uid()
    )
  );

-- Policies for reservation_group_members
CREATE POLICY "Users can view group memberships"
  ON reservation_group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_group_members.reservation_id 
      AND reservations.user_id = auth.uid()
    ) OR is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can insert group members"
  ON reservation_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_group_members.reservation_id 
      AND reservations.user_id = auth.uid()
    )
  );

-- Policies for reservation_history
CREATE POLICY "Users can view their reservation history"
  ON reservation_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_history.reservation_id 
      AND reservations.user_id = auth.uid()
    ) OR is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Admins can insert reservation history"
  ON reservation_history FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid()));

-- Policies for reservation_comments
CREATE POLICY "Users can view reservation comments"
  ON reservation_comments FOR SELECT
  TO authenticated
  USING (
    commenter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE reservations.id = reservation_comments.reservation_id 
      AND reservations.user_id = auth.uid()
    ) OR is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can add reservation comments"
  ON reservation_comments FOR INSERT
  TO authenticated
  WITH CHECK (commenter_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservation_activities_reservation_id ON reservation_activities(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_activities_activity_id ON reservation_activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_reservation_equipment_reservation_id ON reservation_equipment(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_equipment_equipment_id ON reservation_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_reservations_desired_time ON reservations(desired_start_time, desired_end_time);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_attendance_reservation_id ON attendance(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_history_reservation_id ON reservation_history(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_comments_reservation_id ON reservation_comments(reservation_id);
