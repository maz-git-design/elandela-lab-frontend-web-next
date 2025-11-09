/*
  # Initial Database Schema for Lab Management System

  ## Overview
  This migration sets up the complete database schema for a laboratory management system.

  ## New Tables
  - departments: Academic departments
  - academic_years: Academic year tracking
  - roles: User roles (admin, instructor, student)
  - permissions: System permissions
  - role_permissions: Junction table for role-permission mapping
  - cohorts: Student cohorts
  - profiles: User profiles extending auth.users
  - equipment_categories: Equipment categorization
  - equipment: Lab equipment inventory
  - activities: Lab sessions, lectures, workshops
  - reservations: Equipment reservations
  - attendance: Attendance tracking (manual, face, QR)

  ## Security
  - Enable RLS on all tables
  - Policies based on user roles
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Insert default roles first
INSERT INTO roles (name, description) VALUES
  ('admin', 'System administrator with full access'),
  ('instructor', 'Lab instructor with teaching permissions'),
  ('student', 'Student with limited access')
ON CONFLICT (name) DO NOTHING;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  module text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Create cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES cohorts(id) ON DELETE SET NULL,
  face_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create equipment_categories table
CREATE TABLE IF NOT EXISTS equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  category_id uuid REFERENCES equipment_categories(id) ON DELETE SET NULL,
  description text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  qr_code text UNIQUE,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  activity_type text DEFAULT 'lab_session' CHECK (activity_type IN ('lab_session', 'lecture', 'workshop')),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  instructor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  equipment_id uuid REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  purpose text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  type text DEFAULT 'manual' CHECK (type IN ('manual', 'face', 'qr')),
  status text DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policies for departments
CREATE POLICY "Users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- Policies for academic_years
CREATE POLICY "Users can view academic years"
  ON academic_years FOR SELECT
  TO authenticated
  USING (true);

-- Policies for roles
CREATE POLICY "Users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Policies for permissions
CREATE POLICY "Users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- Policies for role_permissions
CREATE POLICY "Users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Policies for cohorts
CREATE POLICY "Users can view cohorts"
  ON cohorts FOR SELECT
  TO authenticated
  USING (true);

-- Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies for equipment_categories
CREATE POLICY "Users can view equipment categories"
  ON equipment_categories FOR SELECT
  TO authenticated
  USING (true);

-- Policies for equipment
CREATE POLICY "Users can view equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (true);

-- Policies for activities
CREATE POLICY "Users can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

-- Policies for reservations
CREATE POLICY "Users can view own reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies for attendance
CREATE POLICY "Users can view own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert default permissions
INSERT INTO permissions (name, description, module) VALUES
  ('view_dashboard', 'View dashboard', 'dashboard'),
  ('manage_users', 'Manage users', 'users'),
  ('view_users', 'View users', 'users'),
  ('manage_equipment', 'Manage lab equipment', 'equipment'),
  ('view_equipment', 'View lab equipment', 'equipment'),
  ('manage_reservations', 'Manage reservations', 'reservations'),
  ('create_reservation', 'Create reservation', 'reservations'),
  ('view_reservations', 'View reservations', 'reservations'),
  ('manage_attendance', 'Manage attendance', 'attendance'),
  ('view_attendance', 'View attendance', 'attendance'),
  ('mark_attendance', 'Mark own attendance', 'attendance'),
  ('manage_roles', 'Manage roles and permissions', 'admin'),
  ('manage_departments', 'Manage departments', 'management'),
  ('manage_cohorts', 'Manage cohorts', 'management'),
  ('manage_activities', 'Manage activities', 'management')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category_id ON equipment(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_equipment_id ON reservations(equipment_id);
CREATE INDEX IF NOT EXISTS idx_reservations_start_time ON reservations(start_time);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_activity_id ON attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_activities_instructor_id ON activities(instructor_id);
CREATE INDEX IF NOT EXISTS idx_activities_department_id ON activities(department_id);
