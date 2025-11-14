/*
  # Add RLS Policies for Attendance Management

  1. Changes
    - Add INSERT policy for lab admins and super admins to mark attendance
    - Add UPDATE policy for lab admins and super admins to update check-out times
    - Keep existing SELECT policy for users to view their own attendance

  2. Security
    - Only authenticated users with lab_admin or super_admin role can insert/update attendance
    - Users can still view their own attendance records
    - Maintains data integrity while allowing attendance management

  3. Notes
    - Uses role_id to check against roles table
    - Super admin role ID: fefc3b0a-0be1-4117-a241-adfb2e23879f
    - Lab admin role ID: 86083e6f-fbe1-4b54-8f20-06546a099926
*/

-- Add INSERT policy for lab admins and super admins to mark attendance
CREATE POLICY "Lab admins can create attendance records"
  ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.id = auth.uid()
      AND roles.name IN ('lab_admin', 'super_admin')
    )
  );

-- Add UPDATE policy for lab admins and super admins to update attendance (check-out)
CREATE POLICY "Lab admins can update attendance records"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.id = auth.uid()
      AND roles.name IN ('lab_admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.id = auth.uid()
      AND roles.name IN ('lab_admin', 'super_admin')
    )
  );
