-- ============================================
-- Migration 004: Add multi-organization support
-- 多机构管理支持
-- ============================================

-- 1. 创建机构表
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建默认机构（SunnyBridge 自己）
INSERT OR IGNORE INTO organizations (id, name, contact_name, notes, status) VALUES (1, 'SunnyBridge', '系统管理员', '默认机构', 'active');

-- 2. 学生表增加 organization_id
ALTER TABLE students ADD COLUMN organization_id INTEGER DEFAULT 1;

-- 更新现有数据到默认机构
UPDATE students SET organization_id = 1 WHERE organization_id IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_students_organization ON students (organization_id);

-- 3. 教师表增加 organization_id
ALTER TABLE teachers ADD COLUMN organization_id INTEGER DEFAULT 1;

-- 更新现有数据到默认机构
UPDATE teachers SET organization_id = 1 WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_organization ON teachers (organization_id);

-- 4. 课时包表增加 organization_id
ALTER TABLE packages ADD COLUMN organization_id INTEGER DEFAULT 1;

UPDATE packages SET organization_id = 1 WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_packages_organization ON packages (organization_id);

-- 5. 上课记录表增加 organization_id
ALTER TABLE classes ADD COLUMN organization_id INTEGER DEFAULT 1;

UPDATE classes SET organization_id = 1 WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_classes_organization ON classes (organization_id);

-- 6. 付款记录表增加 organization_id
ALTER TABLE payments ADD COLUMN organization_id INTEGER DEFAULT 1;

UPDATE payments SET organization_id = 1 WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments (organization_id);

-- 7. 创建用户表（用于登录和权限管理）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'org_admin' CHECK (role IN ('super_admin', 'org_admin', 'teacher', 'viewer')),
  organization_id INTEGER DEFAULT 1,
  teacher_id INTEGER,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users (organization_id);

-- 8. 创建默认超级管理员账号（密码需要单独设置）
-- INSERT OR IGNORE INTO users (username, password_hash, name, role, organization_id, status) 
-- VALUES ('admin', '需要bcrypt哈希后的密码', '系统管理员', 'super_admin', 1, 'active');