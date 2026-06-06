-- 重建 teacher_payments 表以更新 CHECK 约束
-- SQLite 不支持直接修改 CHECK 约束，需要重建表

-- 1. 创建新表
CREATE TABLE IF NOT EXISTS teacher_payments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_classes INTEGER NOT NULL DEFAULT 0,
  total_hours REAL NOT NULL DEFAULT 0,
  hourly_rate REAL NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  payment_method TEXT CHECK (payment_method IN ('gcash', 'bank', 'cash', 'other')),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 2. 复制数据
INSERT INTO teacher_payments_new SELECT * FROM teacher_payments;

-- 3. 删除旧表
DROP TABLE teacher_payments;

-- 4. 重命名新表
ALTER TABLE teacher_payments_new RENAME TO teacher_payments;
