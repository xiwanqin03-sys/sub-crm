-- 013: 教材库系统 - 建表 + 预插入数据
-- 三张表: textbooks(教材目录), textbook_units(单元列表), unit_content(AI提取的内容)

-- ========================================
-- 1. textbooks: 教材目录
-- ========================================
CREATE TABLE IF NOT EXISTS textbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,          -- 'EU-S', 'EU-L1', 'EU-L2', 'EU-L3'
  name TEXT NOT NULL,                 -- 'Everybody Up Starter'
  series TEXT,                        -- 'Everybody Up'
  publisher TEXT,                     -- 'Oxford'
  level TEXT,                         -- 'Pre-A1', 'A1', 'A2'
  total_units INTEGER DEFAULT 0,     -- 单元总数
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========================================
-- 2. textbook_units: 单元列表
-- ========================================
CREATE TABLE IF NOT EXISTS textbook_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  textbook_id INTEGER NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  textbook_code TEXT NOT NULL,        -- 冗余字段,方便查询 (避免JOIN)
  unit_number INTEGER NOT NULL,       -- 1, 2, 3...
  unit_title TEXT,                    -- 'My Family', 'At School'...
  lesson_count INTEGER DEFAULT 1,     -- 该单元的课时数 (通常EU每单元6-8课时)
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(textbook_code, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_textbook_units_code ON textbook_units(textbook_code);
CREATE INDEX IF NOT EXISTS idx_textbook_units_number ON textbook_units(unit_number);

-- ========================================
-- 3. unit_content: 单元内容 (AI提取后写入)
-- ========================================
CREATE TABLE IF NOT EXISTS unit_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES textbook_units(id) ON DELETE CASCADE,
  textbook_code TEXT NOT NULL,        -- 冗余,方便查询
  unit_number INTEGER NOT NULL,       -- 冗余,方便查询
  vocab TEXT,                         -- JSON: [{"word":"apple","translation":"苹果","is_core":true,"difficulty":1}]
  patterns TEXT,                      -- JSON: [{"pattern":"I like apples.","translation":"我喜欢苹果。","is_core":true}]
  grammar TEXT,                        -- JSON: [{"point":"Present Simple","example":"She plays tennis.","is_core":true}]
  extracted_by TEXT DEFAULT 'manual',  -- 'claude' | 'manual'
  extracted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(unit_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_content_lookup ON unit_content(textbook_code, unit_number);

-- ========================================
-- 4. classes 表加教材关联字段 (排课时指定)
-- ========================================
-- 不需要 DROP/重建,直接 ADD COLUMN (SQLite 支持)
-- 但 011/012 已重建过 classes 表,这次也用 ADD COLUMN (不需要重建)
-- 注意: D1 支持 ALTER TABLE ADD COLUMN
ALTER TABLE classes ADD COLUMN textbook_code TEXT;     -- 'EU-L1'
ALTER TABLE classes ADD COLUMN unit_number INTEGER;     -- 3

-- ========================================
-- 预插入教材基础数据
-- ========================================
INSERT INTO textbooks (code, name, series, publisher, level, total_units, description) VALUES
  ('EU-S',  'Everybody Up Starter',  'Everybody Up', 'Oxford', 'Pre-A1', 10, 'Everybody Up 起点级，适合零基础'),
  ('EU-L1', 'Everybody Up Level 1',   'Everybody Up', 'Oxford', 'A1',     10, 'Everybody Up 第一级'),
  ('EU-L2', 'Everybody Up Level 2',   'Everybody Up', 'Oxford', 'A1+',    10, 'Everybody Up 第二级'),
  ('EU-L3', 'Everybody Up Level 3',   'Everybody Up', 'Oxford', 'A2',     10, 'Everybody Up 第三级');

-- ========================================
-- 预插入 EU Starter 单元列表 (10单元)
-- ========================================
INSERT INTO textbook_units (textbook_id, textbook_code, unit_number, unit_title, lesson_count) VALUES
  (1, 'EU-S', 1,  'Hello!',            6),
  (1, 'EU-S', 2,  'My Family',         6),
  (1, 'EU-S', 3,  'Colors',            6),
  (1, 'EU-S', 4,  'My Body',           6),
  (1, 'EU-S', 5,  'Animals',           6),
  (1, 'EU-S', 6,  'Food',              6),
  (1, 'EU-S', 7,  'My Day',            6),
  (1, 'EU-S', 8,  'Toys',              6),
  (1, 'EU-S', 9,  'Clothes',           6),
  (1, 'EU-S', 10, 'Review',            6);

-- ========================================
-- 预插入 EU L1 单元列表 (10单元)
-- ========================================
INSERT INTO textbook_units (textbook_id, textbook_code, unit_number, unit_title, lesson_count) VALUES
  (2, 'EU-L1', 1,  'Friends',          8),
  (2, 'EU-L1', 2,  'Animals',          8),
  (2, 'EU-L1', 3,  'Family',           8),
  (2, 'EU-L1', 4,  'Food',             8),
  (2, 'EU-L1', 5,  'My Day',           8),
  (2, 'EU-L1', 6,  'Hobbies',          8),
  (2, 'EU-L1', 7,  'Places',           8),
  (2, 'EU-L1', 8,  'Clothes',          8),
  (2, 'EU-L1', 9,  'Sports',           8),
  (2, 'EU-L1', 10, 'Review',           8);

-- ========================================
-- 预插入 EU L2 单元列表 (10单元)
-- ========================================
INSERT INTO textbook_units (textbook_id, textbook_code, unit_number, unit_title, lesson_count) VALUES
  (3, 'EU-L2', 1,  'Friends',          8),
  (3, 'EU-L2', 2,  'School',           8),
  (3, 'EU-L2', 3,  'Food',             8),
  (3, 'EU-L2', 4,  'Animals',          8),
  (3, 'EU-L2', 5,  'My Day',           8),
  (3, 'EU-L2', 6,  'Hobbies',          8),
  (3, 'EU-L2', 7,  'Places',           8),
  (3, 'EU-L2', 8,  'Weather',          8),
  (3, 'EU-L2', 9,  'Health',           8),
  (3, 'EU-L2', 10, 'Review',           8);

-- ========================================
-- 预插入 EU L3 单元列表 (10单元)
-- ========================================
INSERT INTO textbook_units (textbook_id, textbook_code, unit_number, unit_title, lesson_count) VALUES
  (4, 'EU-L3', 1,  'Friends',          8),
  (4, 'EU-L3', 2,  'School',           8),
  (4, 'EU-L3', 3,  'Food',             8),
  (4, 'EU-L3', 4,  'Animals',          8),
  (4, 'EU-L3', 5,  'My Day',           8),
  (4, 'EU-L3', 6,  'Hobbies',          8),
  (4, 'EU-L3', 7,  'Places',           8),
  (4, 'EU-L3', 8,  'Weather',          8),
  (4, 'EU-L3', 9,  'Health',           8),
  (4, 'EU-L3', 10, 'Review',           8);
