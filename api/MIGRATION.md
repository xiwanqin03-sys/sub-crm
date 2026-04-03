# 数据库迁移说明

## 问题
`classes` 表缺少 `teacher_id` 字段，导致教师门户无法正确过滤课程，进而导致课时扣除失败。

## 迁移步骤

### 步骤 1：添加 teacher_id 字段
```bash
cd /home/billow/.openclaw/workspace/projects/sunnybridge-crm/api
wrangler d1 execute sunnybridge-crm --remote --command "ALTER TABLE classes ADD COLUMN teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;"
```

### 步骤 2：创建索引
```bash
wrangler d1 execute sunnybridge-crm --remote --command "CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes (teacher_id);"
```

### 步骤 3：迁移数据（将 teacher 字段匹配到 teacher_id）
```bash
wrangler d1 execute sunnybridge-crm --remote --command "UPDATE classes SET teacher_id = (SELECT id FROM teachers WHERE name = classes.teacher) WHERE teacher IS NOT NULL;"
```

### 步骤 4：验证迁移结果
```bash
wrangler d1 execute sunnybridge-crm --remote --command "SELECT COUNT(*) as total, COUNT(teacher_id) as with_teacher_id FROM classes;"
```

## 执行迁移
```bash
cd /home/billow/.openclaw/workspace/projects/sunnybridge-crm/api
bash migrations/migrate_teacher_id.sh
```

## 回滚（如果需要）
```bash
# SQLite 不支持 DROP COLUMN，需要重建表
# 这是一个危险操作，请谨慎执行
```

## 更新后端代码
后端代码（`api/src/routes/classes.js`）已经正确返回 `teacher_id` 字段。

## 重新部署 API
```bash
cd /home/billow/.openclaw/workspace/projects/sunnybridge-crm/api
wrangler deploy
```

## 测试
迁移完成后，访问教师门户，确认：
1. 课程列表正确显示
2. 提交反馈后，课时正确扣除
