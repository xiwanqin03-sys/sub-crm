-- 011: 阶段性学习报告表
CREATE TABLE IF NOT EXISTS progress_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER,
  report_type TEXT NOT NULL,          -- milestone_10 / milestone_30 / milestone_60 / level_up
  teacher_id INTEGER,
  teacher_name TEXT,
  summary TEXT,                       -- 老师总评
  strengths TEXT,                     -- 亮点
  improvements TEXT,                  -- 需提升
  recommendation TEXT,                -- 下阶段建议
  teacher_message TEXT,               -- 老师寄语
  from_level TEXT,                     -- 升级前级别(仅level_up)
  to_level TEXT,                       -- 升级后级别(仅level_up)
  status TEXT DEFAULT 'published',
  organization_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_progress_reports_student ON progress_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_type ON progress_reports(report_type);
