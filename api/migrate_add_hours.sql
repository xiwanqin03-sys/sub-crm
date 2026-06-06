-- 迁移：在 students 表添加 total_hours 和 used_hours 字段
-- 执行日期：2026-04-10

-- SQLite 不支持 ADD COLUMN IF NOT EXISTS，需要手动检查
-- 如果字段已存在会报错，可以忽略

ALTER TABLE students ADD COLUMN total_hours INTEGER NOT NULL DEFAULT 0 CHECK (total_hours >= 0);
ALTER TABLE students ADD COLUMN used_hours INTEGER NOT NULL DEFAULT 0 CHECK (used_hours >= 0);

-- 从现有 packages 数据迁移到 students
UPDATE students SET 
  total_hours = (
    SELECT COALESCE(SUM(total), 0) FROM packages WHERE student_id = students.id
  ),
  used_hours = (
    SELECT COALESCE(SUM(used), 0) FROM packages WHERE student_id = students.id
  );
