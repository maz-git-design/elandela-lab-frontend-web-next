/*
  # Add SELECT Policy for Lab Admins to View All Attendance

  1. Changes
    - Add SELECT policy for lab admins and super admins to view all attendance records
    - This allows them to see attendance for the Mark Attendance dialog and reports

  2. Security
    - Only authenticated users with lab_admin or super_admin role can view all attendance
    - Regular users still only see their own attendance records
*/

-- Add SELECT policy for lab admins and super admins to view all attendance
CREATE POLICY "Lab admins can view all attendance records"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON profiles.role_id = roles.id
      WHERE profiles.id = auth.uid()
      AND roles.name IN ('lab_admin', 'super_admin')
    )
  );
