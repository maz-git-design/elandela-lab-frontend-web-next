/*
  # Add RBAC Modules and Enhanced User Management

  1. New Tables
    - `modules` - System modules/features with hierarchical structure
    - `role_module_permissions` - Permissions linking roles to modules with specific actions
    - `user_custom_permissions` - User-specific permission overrides
    - `user_status_history` - Track user status changes over time
    
  2. Updates to Existing Tables
    - Add new fields to `profiles` for enhanced user management
    - Maintain compatibility with existing role system
    
  3. Security
    - Enable RLS on all new tables
    - Admin-only access for management operations
    - User can view their own data

  4. Important Notes
    - Works alongside existing roles and permissions tables
    - Adds module-based permissions (Create, Update, List, Delete, *)
    - Tracks user status history
*/

-- Create modules table for hierarchical feature structure
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  parent_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  path text NOT NULL,
  available_actions text[] NOT NULL DEFAULT ARRAY['List'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view modules"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- Create role_module_permissions for granular permissions
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  actions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, module_id)
);

ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role module permissions"
  ON role_module_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role module permissions"
  ON role_module_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- Create user_custom_permissions for user-specific overrides
CREATE TABLE IF NOT EXISTS user_custom_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  actions text[] NOT NULL DEFAULT '{}',
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  UNIQUE(user_id, module_id)
);

ALTER TABLE user_custom_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom permissions"
  ON user_custom_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all custom permissions"
  ON user_custom_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

CREATE POLICY "Admins can manage custom permissions"
  ON user_custom_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- Create user_status_history for tracking status changes
CREATE TABLE IF NOT EXISTS user_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('activated', 'suspended', 'pending', 'deleted')),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  notes text
);

ALTER TABLE user_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own status history"
  ON user_status_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all status history"
  ON user_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

CREATE POLICY "Admins can insert status history"
  ON user_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- Add new columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text CHECK (gender IN ('M', 'F'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'from_active_directory'
  ) THEN
    ALTER TABLE profiles ADD COLUMN from_active_directory boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birthday date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status_state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_state text DEFAULT 'pending' CHECK (status_state IN ('activated', 'suspended', 'pending', 'deleted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status_updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status_updated_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_updated_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'face_encoding_vector'
  ) THEN
    ALTER TABLE profiles ADD COLUMN face_encoding_vector float8[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'face_registered_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN face_registered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'face_updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN face_updated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'face_is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN face_is_active boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role_id ON role_module_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module_id ON role_module_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_user_id ON user_custom_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_permissions_module_id ON user_custom_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_parent_id ON modules(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_status_history_user_id ON user_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_status_state ON profiles(status_state);

-- Insert default modules
INSERT INTO modules (name, description, path, available_actions) VALUES
  ('dashboard', 'Dashboard overview', '/dashboard', ARRAY['List']),
  ('users', 'User management', '/users', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('roles', 'Role management', '/admin/roles', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('modules', 'Module management', '/admin/modules', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('permissions', 'Permission management', '/admin/permissions', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('labs', 'Lab management', '/labs', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('reservations', 'Reservation management', '/reservations', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('attendances', 'Attendance tracking', '/attendances', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('equipment', 'Equipment management', '/equipment', ARRAY['Create', 'Update', 'List', 'Delete']),
  ('activities', 'Activity management', '/activities', ARRAY['Create', 'Update', 'List', 'Delete'])
ON CONFLICT (name) DO NOTHING;