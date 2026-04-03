-- 添加 teacher_id 字段到 classes 表
-- 迁移脚本：将 teacher 字段的值转换为 teacher_id

-- 步骤 1：添加 teacher_id 字段
ALTER TABLE classes ADD COLUMN teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;

-- 步骤 2：创建索引
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes (teacher_id);

-- 步骤 3：迁移数据 - 将 teacher 字段（教师姓名）匹配到 teacher_id
-- 注意：这个迁移需要手动执行，因为 SQLite 不支持 UPDATE...JOIN
-- 你需要运行以下命令来迁移数据：
-- 
-- UPDATE classes SET teacher_id = (SELECT id FROM teachers WHERE name = classes.teacher);
--
-- 或者在代码中处理
