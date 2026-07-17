-- 011: 课后反馈表重构
-- 1. 删除星级评分 (fb_perf_speaking/pronunciation/comprehension/exercise)
-- 2. 合并 fb_highlight + fb_practice → fb_teacher_message
-- 3. 新增 fb_pronunciation_errors / fb_grammar_errors (TEXT存JSON: [{wrong, right}])
-- 4. 保留: fb_lesson_level, fb_unit, fb_lesson, fb_vocab, fb_patterns, fb_grammar,
--          fb_homework, fb_next_preview, fb_teacher_message
-- 5. 保留旧字段 content/homework/notes 兼容历史数据
-- D1 不支持 DROP COLUMN，用重建表方式

-- Step 1: 创建新表
CREATE TABLE classes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  package_id INTEGER,
  teacher TEXT,
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
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  class_link TEXT,
  organization_id INTEGER DEFAULT 1,
  is_trial INTEGER NOT NULL DEFAULT 0,
  -- 课后反馈字段
  fb_lesson_level TEXT,
  fb_unit TEXT,
  fb_lesson TEXT,
  fb_vocab TEXT,
  fb_patterns TEXT,
  fb_grammar TEXT,
  fb_pronunciation_errors TEXT,   -- JSON: [{wrong:"apul", right:"apple"}, ...]
  fb_grammar_errors TEXT,          -- JSON: [{wrong:"He go school", right:"He goes to school"}, ...]
  fb_teacher_message TEXT,         -- 合并: 问候+亮点+练习建议 (原 fb_highlight + fb_practice + fb_teacher_message)
  fb_homework TEXT,                -- 课后作业 (选填)
  fb_next_preview TEXT,            -- 下节课预告 (选填)
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- Step 2: 迁移数据 (fb_highlight + fb_practice 合并到 fb_teacher_message)
INSERT INTO classes_new (
  id, student_id, package_id, teacher, subject, hours, date,
  start_time, end_time, content, homework, notes, status,
  created_at, updated_at, teacher_id, class_link, organization_id, is_trial,
  fb_lesson_level, fb_unit, fb_lesson, fb_vocab, fb_patterns, fb_grammar,
  fb_teacher_message, fb_homework, fb_next_preview
)
SELECT
  id, student_id, package_id, teacher, subject, hours, date,
  start_time, end_time, content, homework, notes, status,
  created_at, updated_at, teacher_id, class_link, organization_id, is_trial,
  fb_lesson_level, fb_unit, fb_lesson, fb_vocab, fb_patterns, fb_grammar,
  -- 合并三段为 fb_teacher_message
  CASE
    WHEN fb_teacher_message IS NOT NULL AND fb_teacher_message != ''
      THEN fb_teacher_message
    WHEN (fb_highlight IS NOT NULL AND fb_highlight != '') OR (fb_practice IS NOT NULL AND fb_practice != '')
      THEN TRIM(
        COALESCE(NULLIF(fb_highlight, ''), '') ||
        CASE WHEN fb_highlight IS NOT NULL AND fb_highlight != '' AND fb_practice IS NOT NULL AND fb_practice != '' THEN char(10) ELSE '' END ||
        COALESCE(NULLIF(fb_practice, ''), '')
      )
    ELSE NULL
  END,
  fb_homework,
  fb_next_preview
FROM classes;

-- Step 3: 删旧表建新表
DROP TABLE classes;
ALTER TABLE classes_new RENAME TO classes;

-- Step 4: 重建索引 (如果有)
CREATE INDEX IF NOT EXISTS idx_classes_student_id ON classes(student_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(date);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON classes(organization_id);
