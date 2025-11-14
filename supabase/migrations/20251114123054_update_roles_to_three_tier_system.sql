/*
  # Update Roles to Three-Tier System

  1. Changes
    - Update role names to match new system:
      - 'student' → 'user' (normal user)
      - 'instructor' → 'lab_admin' (admin of a lab)
      - 'admin' → 'super_admin' (super admin)
    - Update role descriptions
    - Add managed_labs table for lab_admin to track which labs they manage

  2. New Tables
    - `managed_labs`
      - `id` (uuid, primary key)
      - `lab_admin_id` (uuid, foreign key to profiles)
      - `lab_id` (uuid, foreign key to activities)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on managed_labs table
    - Add policies for managed_labs access
*/

-- Update existing role names
UPDATE roles SET 
  name = 'super_admin',
  description = 'Super administrator with full system access'
WHERE name = 'admin';

UPDATE roles SET 
  name = 'lab_admin',
  description = 'Lab administrator who can manage specific labs'
WHERE name = 'instructor';

UPDATE roles SET 
  name = 'user',
  description = 'Normal user with basic access to view and make reservations'
WHERE name = 'student';

-- Create managed_labs table to track which labs each lab_admin manages
CREATE TABLE IF NOT EXISTS managed_labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lab_admin_id, lab_id)
);

ALTER TABLE managed_labs ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all managed_labs records
CREATE POLICY "Super admins can manage all managed_labs"
  ON managed_labs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.name = 'super_admin'
    )
  );

-- Lab admins can view their own managed labs
CREATE POLICY "Lab admins can view their managed labs"
  ON managed_labs FOR SELECT
  TO authenticated
  USING (lab_admin_id = auth.uid());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_managed_labs_admin ON managed_labs(lab_admin_id);
CREATE INDEX IF NOT EXISTS idx_managed_labs_lab ON managed_labs(lab_id);
