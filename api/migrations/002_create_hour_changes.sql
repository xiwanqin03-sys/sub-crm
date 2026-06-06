-- ============================================
-- 课时变动记录表 hour_changes
-- ============================================
-- 记录所有课时变动：收款加课、上课消耗、手动调整
CREATE TABLE IF NOT EXISTS hour_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'class', 'adjust')),
  amount REAL NOT NULL,  -- 正数=加课，负数=消耗
  balance_after REAL,  -- 变动后剩余课时
  related_id INTEGER,  -- 关联记录ID (payment_id 或 class_id)
  related_type TEXT,  -- 'payment' 或 'class'
  description TEXT,  -- 描述/原因
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hour_changes_student_id ON hour_changes (student_id);
CREATE INDEX IF NOT EXISTS idx_hour_changes_created_at ON hour_changes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hour_changes_type ON hour_changes (type);
