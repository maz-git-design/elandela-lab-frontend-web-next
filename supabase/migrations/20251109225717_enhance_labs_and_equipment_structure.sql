/*
  # Enhanced Labs and Equipment Management System

  1. Updates to Existing Tables
    - Enhance `equipment` table with comprehensive fields
    - Enhance labs structure with detailed information
    
  2. New Tables
    - `equipment_specs` - Technical specifications for equipment
    - `equipment_usage_status` - Historical usage status tracking
    - `equipment_swap_history` - Equipment swap/transfer history
    - `equipment_accessories` - Equipment accessories relationships
    - `lab_equipment` - Many-to-many relationship between labs and equipment
    - `lab_opening_hours` - Lab opening hours schedule
    - `lab_timetable` - Lab weekly timetable for activities
    - `lab_safety_requirements` - Lab safety requirements
    - `lab_managers` - Lab managers (students, lecturers, admins)
    
  3. Security
    - Enable RLS on all new tables
    - Appropriate policies for authenticated users

  4. Important Notes
    - Maintains compatibility with existing equipment and equipment_categories
    - Adds comprehensive tracking and management features
*/

-- Add new columns to equipment_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_categories' AND column_name = 'image_path'
  ) THEN
    ALTER TABLE equipment_categories ADD COLUMN image_path text;
  END IF;
END $$;

-- Add new columns to equipment table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE equipment ADD COLUMN serial_number text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'image_path'
  ) THEN
    ALTER TABLE equipment ADD COLUMN image_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'model'
  ) THEN
    ALTER TABLE equipment ADD COLUMN model text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'current_status'
  ) THEN
    ALTER TABLE equipment ADD COLUMN current_status text DEFAULT 'available';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'current_status_updated_at'
  ) THEN
    ALTER TABLE equipment ADD COLUMN current_status_updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'current_status_updated_by'
  ) THEN
    ALTER TABLE equipment ADD COLUMN current_status_updated_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'current_lab_id'
  ) THEN
    ALTER TABLE equipment ADD COLUMN current_lab_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'delivery_date'
  ) THEN
    ALTER TABLE equipment ADD COLUMN delivery_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'entry_date'
  ) THEN
    ALTER TABLE equipment ADD COLUMN entry_date date;
  END IF;
END $$;

-- Create equipment_specs table
CREATE TABLE IF NOT EXISTS equipment_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment specs"
  ON equipment_specs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage equipment specs"
  ON equipment_specs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create equipment_usage_status table
CREATE TABLE IF NOT EXISTS equipment_usage_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  state text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  is_expirable boolean DEFAULT false,
  expire_date date
);

ALTER TABLE equipment_usage_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment usage status"
  ON equipment_usage_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage equipment usage status"
  ON equipment_usage_status FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create equipment_swap_history table
CREATE TABLE IF NOT EXISTS equipment_swap_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  initiated_by uuid REFERENCES profiles(id),
  swap_status text NOT NULL,
  approved_by uuid REFERENCES profiles(id),
  swapping_date timestamptz,
  from_lab_id uuid,
  to_lab_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_swap_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment swap history"
  ON equipment_swap_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage equipment swap history"
  ON equipment_swap_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create equipment_accessories table (many-to-many)
CREATE TABLE IF NOT EXISTS equipment_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  accessory_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(equipment_id, accessory_id)
);

ALTER TABLE equipment_accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment accessories"
  ON equipment_accessories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage equipment accessories"
  ON equipment_accessories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create lab_equipment table (many-to-many)
CREATE TABLE IF NOT EXISTS lab_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lab_id, equipment_id)
);

ALTER TABLE lab_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lab equipment"
  ON lab_equipment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lab equipment"
  ON lab_equipment FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update activities table structure for labs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'lab_code'
  ) THEN
    ALTER TABLE activities ADD COLUMN lab_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'building'
  ) THEN
    ALTER TABLE activities ADD COLUMN building text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'room_number'
  ) THEN
    ALTER TABLE activities ADD COLUMN room_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'floor'
  ) THEN
    ALTER TABLE activities ADD COLUMN floor int;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'capacity_users'
  ) THEN
    ALTER TABLE activities ADD COLUMN capacity_users int;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'capacity_equipment'
  ) THEN
    ALTER TABLE activities ADD COLUMN capacity_equipment int;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'lab_status'
  ) THEN
    ALTER TABLE activities ADD COLUMN lab_status text DEFAULT 'active' CHECK (lab_status IN ('active', 'under_maintenance', 'closed'));
  END IF;
END $$;

-- Create lab_opening_hours table
CREATE TABLE IF NOT EXISTS lab_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  day text NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  open_time text NOT NULL,
  close_time text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_opening_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lab opening hours"
  ON lab_opening_hours FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lab opening hours"
  ON lab_opening_hours FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create lab_timetable table
CREATE TABLE IF NOT EXISTS lab_timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  day text NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time text NOT NULL,
  end_time text NOT NULL,
  activity text NOT NULL,
  reserved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_timetable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lab timetable"
  ON lab_timetable FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lab timetable"
  ON lab_timetable FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create lab_safety_requirements table
CREATE TABLE IF NOT EXISTS lab_safety_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  requirement text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_safety_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lab safety requirements"
  ON lab_safety_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lab safety requirements"
  ON lab_safety_requirements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create lab_access_restrictions table
CREATE TABLE IF NOT EXISTS lab_access_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  allowed_roles text[] NOT NULL DEFAULT '{}',
  min_level int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lab_id)
);

ALTER TABLE lab_access_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lab access restrictions"
  ON lab_access_restrictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lab access restrictions"
  ON lab_access_restrictions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create lab_managers table
CREATE TABLE IF NOT EXISTS lab_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(lab_id, user_id, role)
);

ALTER TABLE lab_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lab managers"
  ON lab_managers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lab managers"
  ON lab_managers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_specs_equipment_id ON equipment_specs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_status_equipment_id ON equipment_usage_status(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_swap_history_equipment_id ON equipment_swap_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_accessories_equipment_id ON equipment_accessories(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_accessories_accessory_id ON equipment_accessories(accessory_id);
CREATE INDEX IF NOT EXISTS idx_lab_equipment_lab_id ON lab_equipment(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_equipment_equipment_id ON lab_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_lab_opening_hours_lab_id ON lab_opening_hours(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_timetable_lab_id ON lab_timetable(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_safety_requirements_lab_id ON lab_safety_requirements(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_managers_lab_id ON lab_managers(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_managers_user_id ON lab_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_serial_number ON equipment(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_current_lab_id ON equipment(current_lab_id) WHERE current_lab_id IS NOT NULL;