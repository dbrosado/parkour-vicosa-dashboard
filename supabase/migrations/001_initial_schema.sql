-- ============================================================
-- Parkour Vicosa Dashboard - Database Schema
-- ============================================================

-- 1. Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'instructor' CHECK (role IN ('admin', 'instructor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'instructor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Students (JSONB document store)
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Instructors (JSONB document store)
CREATE TABLE instructors (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. App state (daily assignments, attendance, etc.)
CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initialize app_state keys
INSERT INTO app_state (key, data) VALUES
  ('daily_assignments', '{}'),
  ('daily_attendance', '{}');

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, but only update their own
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admin-only: insert/delete profiles (for managing instructors)
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Students: all authenticated users can CRUD
CREATE POLICY "Authenticated users can read students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (true);

-- Instructors: all authenticated users can read, admins can write
CREATE POLICY "Authenticated users can read instructors"
  ON instructors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage instructors"
  ON instructors FOR ALL
  TO authenticated
  USING (true);

-- App state: all authenticated users can CRUD
CREATE POLICY "Authenticated users can read app_state"
  ON app_state FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update app_state"
  ON app_state FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_students_data_name ON students USING GIN ((data->'name'));
CREATE INDEX idx_students_data_status ON students USING GIN ((data->'status'));
