-- 添加教师分享链接和密码字段
-- 2026-04-04: 方案二方式A（分享链接 + 密码验证）

-- 步骤1：添加普通列（不带 UNIQUE 约束）
ALTER TABLE teachers ADD COLUMN password TEXT;
ALTER TABLE teachers ADD COLUMN share_token TEXT;

-- 注意：UNIQUE 约束需要重建表，这里先用普通列
-- 在应用层保证唯一性即可

-- 创建索引加速查询（非唯一索引）
CREATE INDEX IF NOT EXISTS idx_teachers_share_token ON teachers (share_token);
