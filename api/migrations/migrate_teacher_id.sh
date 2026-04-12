#!/bin/bash
# 迁移脚本：添加 teacher_id 字段并迁移数据

echo "=== Sunnybridge CRM 数据库迁移 ==="
echo "步骤 1：添加 teacher_id 字段..."
wrangler d1 execute sunnybridge-crm --remote --command "ALTER TABLE classes ADD COLUMN teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;"

echo "步骤 2：创建索引..."
wrangler d1 execute sunnybridge-crm --remote --command "CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes (teacher_id);"

echo "步骤 3：迁移数据 - 将 teacher 字段匹配到 teacher_id..."
wrangler d1 execute sunnybridge-crm --remote --command "UPDATE classes SET teacher_id = (SELECT id FROM teachers WHERE name = classes.teacher) WHERE teacher IS NOT NULL;"

echo "步骤 4：验证迁移结果..."
wrangler d1 execute sunnybridge-crm --remote --command "SELECT COUNT(*) as total, COUNT(teacher_id) as with_teacher_id FROM classes;"

echo "=== 迁移完成 ==="
