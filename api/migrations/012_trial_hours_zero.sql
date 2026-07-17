-- 012: 放宽 classes.hours CHECK 约束 (允许 0, 体验课课时=0)
-- D1 不支持 ALTER TABLE 修改 CHECK 约束，需重建表

-- Step 1: 创建新表 (hours >= 0)
CREATE TABLE classes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  package_id INTEGER,
  teacher TEXT,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  subject TEXT,
  hours REAL NOT NULL DEFAULT 1 CHECK (hours >= 0),
  date TEXT NOT NULL DEFAULT (date('now')),
  start_time TEXT,
  end_time TEXT,
  content TEXT,
  homework TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'absent')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  class_link TEXT,
  organization_id INTEGER DEFAULT 1,
  is_trial INTEGER NOT NULL DEFAULT 0,
  fb_lesson_level TEXT,
  fb_unit TEXT,
  fb_lesson TEXT,
  fb_vocab TEXT,
  fb_patterns TEXT,
  fb_grammar TEXT,
  fb_pronunciation_errors TEXT,
  fb_grammar_errors TEXT,
  fb_teacher_message TEXT,
  fb_homework TEXT,
  fb_next_preview TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- Step 2: 迁移数据 (体验课 hours 设为 0)
INSERT INTO classes_new SELECT
  id, student_id, package_id, teacher, teacher_id, subject,
  CASE WHEN is_trial = 1 THEN 0 ELSE hours END,
  date, start_time, end_time, content, homework, notes, status,
  created_at, updated_at, class_link, organization_id, is_trial,
  fb_lesson_level, fb_unit, fb_lesson, fb_vocab, fb_patterns, fb_grammar,
  fb_pronunciation_errors, fb_grammar_errors, fb_teacher_message,
  fb_homework, fb_next_preview
FROM classes;

-- Step 3: 替换表
DROP TABLE classes;
ALTER TABLE classes_new RENAME TO classes;

-- Step 4: 重建索引
CREATE INDEX IF NOT EXISTS idx_classes_student_id ON classes(student_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(date);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON classes(organization_id);
