-- 添加 hours 字段到 payments 表
ALTER TABLE payments ADD COLUMN hours INTEGER DEFAULT 0;
