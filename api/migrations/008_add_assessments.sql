-- ============================================
-- Migration 008: Assessments table + is_trial on classes
-- 体验课评估报告系统
-- ============================================

-- 1. classes 表新增 is_trial 字段
ALTER TABLE classes ADD COLUMN is_trial INTEGER NOT NULL DEFAULT 0;

-- 2. 评估报告表
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  teacher_id INTEGER,
  
  -- 听力评估 (1-5星)
  listening_conversation INTEGER,        -- 日常对话理解
  listening_key_info INTEGER,           -- 关键信息抓取
  listening_comments TEXT,              -- 听力评语
  
  -- 口语评估
  speaking_pronunciation INTEGER,      -- 发音与流利度
  speaking_communication INTEGER,       -- 表达能力
  speaking_comments TEXT,              -- 口语评语
  
  -- 阅读评估
  reading_vocabulary INTEGER,           -- 词汇量
  reading_comprehension INTEGER,        -- 阅读理解
  reading_comments TEXT,                -- 阅读评语
  
  -- 写作评估
  writing_spelling INTEGER,             -- 基础拼写
  writing_sentences INTEGER,            -- 简单句构建
  writing_comments TEXT,                -- 写作评语
  
  -- 课堂表现
  classroom_participation INTEGER,      -- 参与度
  classroom_focus INTEGER,              -- 专注力
  classroom_interaction INTEGER,        -- 互动意愿
  classroom_comments TEXT,             -- 课堂表现评语
  
  -- 综合评估
  strengths TEXT,                        -- 强项
  improvements TEXT,                     -- 待提升
  recommended_level TEXT,               -- 建议课程级别 (Pre-A1, A1, A2, B1等)
  teacher_message TEXT,                 -- 教师寄语
  
  -- 元数据
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  organization_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_assessments_class_id ON assessments (class_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student_id ON assessments (student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_teacher_id ON assessments (teacher_id);
CREATE INDEX IF NOT EXISTS idx_assessments_org_id ON assessments (organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments (status);
