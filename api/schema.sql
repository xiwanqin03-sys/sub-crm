-- Sunnybridge CRM Database Schema for Cloudflare D1
-- SQLite 语法
-- ============================================
-- 1. Students 表（学生信息）
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  age INTEGER CHECK (age >= 0 AND age <= 120),
  grade TEXT,
  parent_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_name ON students (name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students (phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students (created_at);

-- ============================================
-- 2. Packages 表（课时包）
-- ============================================
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  name TEXT,
  total INTEGER NOT NULL CHECK (total > 0),
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  remaining INTEGER NOT NULL DEFAULT 0,
  price REAL CHECK (price >= 0),
  purchase_date TEXT NOT NULL DEFAULT (date('now')),
  expire_date TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'refunded')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packages_student_id ON packages (student_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages (status);
CREATE INDEX IF NOT EXISTS idx_packages_expire_date ON packages (expire_date);

-- ============================================
-- 3. Classes 表（上课记录）
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  package_id INTEGER,
  teacher TEXT,
  teacher_id INTEGER,
  subject TEXT,
  hours REAL NOT NULL DEFAULT 1 CHECK (hours > 0),
  date TEXT NOT NULL DEFAULT (date('now')),
  start_time TEXT,
  end_time TEXT,
  content TEXT,
  homework TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'absent')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_student_id ON classes (student_id);
CREATE INDEX IF NOT EXISTS idx_classes_package_id ON classes (package_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes (teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes (date);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes (status);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes (teacher);

-- ============================================
-- 4. Payments 表（付款记录）
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'wechat', 'alipay', 'bank', 'other')),
  package_id INTEGER,
  description TEXT,
  date TEXT NOT NULL DEFAULT (date('now')),
  receipt_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments (student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (date);
CREATE INDEX IF NOT EXISTS idx_payments_package_id ON payments (package_id);

-- ============================================
-- 5. Teachers 表（教师信息）
-- ============================================
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  subjects TEXT,
  hourly_rate REAL CHECK (hourly_rate >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers (name);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers (status);

-- ============================================
-- 6. Courses 表（课程模板）
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all')),
  duration INTEGER DEFAULT 60,
  price REAL CHECK (price >= 0),
  description TEXT,
  teacher_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_name ON courses (name);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses (subject);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses (teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses (status);

-- ============================================
-- 7. Settings 表（系统设置）
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 初始化默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES ('school_name', '阳光桥在线英语');
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'CNY');
INSERT OR IGNORE INTO settings (key, value) VALUES ('timezone', 'Asia/Shanghai');