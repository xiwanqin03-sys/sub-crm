# Sunnybridge CRM 数据库设计文档

## 概述

基于 Cloudflare D1 (SQLite) 设计，遵循 PostgreSQL 技能的最佳实践。

## 数据模型

### ER 图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  students   │────<│  packages   │     │  teachers   │
│             │     │             │     │             │
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ name        │     │ student_id  │     │ name        │
│ phone       │     │ total       │     │ subjects    │
│ email       │     │ used        │     │ status      │
│ status      │     │ remaining   │     └─────────────┘
└─────────────┘     └─────────────┘
       │                   │
       │                   │
       │           ┌───────┴───────┐
       │           │               │
       ▼           ▼               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   classes   │     │  payments   │     │  settings   │
│             │     │             │     │             │
│ id (PK)     │     │ id (PK)     │     │ key (PK)    │
│ student_id  │     │ student_id  │     │ value       │
│ package_id  │     │ package_id  │     └─────────────┘
│ hours       │     │ amount      │
│ date        │     │ date        │
│ status      │     │ method      │
└─────────────┘     └─────────────┘
```

## 表结构详解

### 1. students（学生表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL | 学生姓名 |
| phone | TEXT | | 联系电话 |
| email | TEXT | | 电子邮箱 |
| age | INTEGER | CHECK (0-120) | 年龄 |
| grade | TEXT | | 年级 |
| parent_name | TEXT | | 家长姓名 |
| notes | TEXT | | 备注 |
| status | TEXT | DEFAULT 'active' | 状态：active/inactive/graduated |
| created_at | TEXT | DEFAULT datetime('now') | 创建时间 |
| updated_at | TEXT | DEFAULT datetime('now') | 更新时间 |

**索引**：
- `idx_students_name` - 姓名搜索
- `idx_students_phone` - 电话搜索
- `idx_students_status` - 状态筛选
- `idx_students_created_at` - 创建时间排序

### 2. packages（课时包表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| student_id | INTEGER | NOT NULL, FK → students | 学生ID |
| name | TEXT | | 课时包名称 |
| total | INTEGER | NOT NULL, CHECK > 0 | 总课时 |
| used | INTEGER | DEFAULT 0, CHECK >= 0 | 已用课时 |
| remaining | INTEGER | DEFAULT 0 | 剩余课时 |
| price | REAL | CHECK >= 0 | 购买价格 |
| purchase_date | TEXT | DEFAULT datetime('now') | 购买日期 |
| expire_date | TEXT | | 过期日期 |
| notes | TEXT | | 备注 |
| status | TEXT | DEFAULT 'active' | 状态：active/expired/refunded |
| created_at | TEXT | DEFAULT datetime('now') | 创建时间 |
| updated_at | TEXT | DEFAULT datetime('now') | 更新时间 |

**索引**：
- `idx_packages_student_id` - 外键索引（必须）
- `idx_packages_status` - 状态筛选
- `idx_packages_expire_date` - 过期日期筛选

### 3. classes（上课记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| student_id | INTEGER | NOT NULL, FK → students | 学生ID |
| package_id | INTEGER | FK → packages | 课时包ID |
| teacher | TEXT | | 授课教师 |
| subject | TEXT | | 科目 |
| hours | REAL | DEFAULT 1, CHECK > 0 | 课时数 |
| date | TEXT | DEFAULT date('now') | 上课日期 |
| start_time | TEXT | | 开始时间 |
| end_time | TEXT | | 结束时间 |
| content | TEXT | | 上课内容 |
| homework | TEXT | | 课后作业 |
| notes | TEXT | | 备注 |
| status | TEXT | DEFAULT 'completed' | 状态：scheduled/completed/cancelled/absent |
| created_at | TEXT | DEFAULT datetime('now') | 创建时间 |
| updated_at | TEXT | DEFAULT datetime('now') | 更新时间 |

**索引**：
- `idx_classes_student_id` - 外键索引（必须）
- `idx_classes_package_id` - 外键索引
- `idx_classes_date` - 日期筛选
- `idx_classes_status` - 状态筛选
- `idx_classes_teacher` - 教师筛选

### 4. payments（付款记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| student_id | INTEGER | NOT NULL, FK → students | 学生ID |
| amount | REAL | NOT NULL, CHECK > 0 | 付款金额 |
| payment_method | TEXT | CHECK | 支付方式：cash/wechat/alipay/bank/other |
| package_id | INTEGER | FK → packages | 关联课时包 |
| description | TEXT | | 付款说明 |
| date | TEXT | DEFAULT date('now') | 付款日期 |
| receipt_number | TEXT | | 收据编号 |
| notes | TEXT | | 备注 |
| created_at | TEXT | DEFAULT datetime('now') | 创建时间 |

**索引**：
- `idx_payments_student_id` - 外键索引（必须）
- `idx_payments_date` - 日期筛选
- `idx_payments_package_id` - 关联课时包

### 5. teachers（教师表）- 新增

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL | 教师姓名 |
| phone | TEXT | | 联系电话 |
| email | TEXT | | 电子邮箱 |
| subjects | TEXT | | 教授科目（JSON数组） |
| hourly_rate | REAL | CHECK >= 0 | 时薪 |
| status | TEXT | DEFAULT 'active' | 状态：active/inactive |
| notes | TEXT | | 备注 |
| created_at | TEXT | DEFAULT datetime('now') | 创建时间 |
| updated_at | TEXT | DEFAULT datetime('now') | 更新时间 |

### 6. settings（系统设置表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| key | TEXT | PRIMARY KEY | 设置键 |
| value | TEXT | NOT NULL | 设置值 |
| updated_at | TEXT | DEFAULT datetime('now') | 更新时间 |

---

## 设计原则应用

### 1. 主键设计
- 使用 `INTEGER PRIMARY KEY AUTOINCREMENT`（SQLite 标准方式）
- 对应 PostgreSQL 的 `BIGINT GENERATED ALWAYS AS IDENTITY`

### 2. 时间字段
- 使用 `TEXT` 存储时间（SQLite 推荐方式）
- 格式：ISO 8601（`YYYY-MM-DD HH:MM:SS` 或 `YYYY-MM-DD`）
- 默认值：`datetime('now')` 或 `date('now')`

### 3. 外键约束
- 所有外键都有索引（SQLite 不自动创建）
- 使用 `ON DELETE CASCADE` 删除关联数据
- 使用 `ON DELETE SET NULL` 保留历史记录

### 4. CHECK 约束
- 数值范围验证（如 `CHECK (age >= 0)`）
- 枚举值验证（如 `CHECK (status IN (...))`）

### 5. 触发器
- 自动更新 `updated_at` 字段
- 自动扣减/恢复课时

---

## 视图

### student_package_summary（学生课时汇总）

```sql
-- 查询每个学生的课时汇总
SELECT * FROM student_package_summary WHERE remaining_hours < 5;
```

### monthly_stats（月度统计）

```sql
-- 查询某月的上课统计
SELECT * FROM monthly_stats WHERE month = '2026-03';
```

### monthly_revenue（月度收入）

```sql
-- 查询收入趋势
SELECT * FROM monthly_revenue ORDER BY month DESC LIMIT 12;
```

---

## 迁移计划

### localStorage → D1 迁移步骤

1. **导出 localStorage 数据**
   ```javascript
   const data = localStorage.getItem('sunnybridge_crm_data');
   ```

2. **转换数据格式**
   - `id`: 字符串 → 整数
   - `createdAt`: ISO 字符串 → 保持不变
   - 关系字段重命名：`studentId` → `student_id`

3. **导入 D1**
   - 使用 Cloudflare Dashboard 或 Wrangler CLI
   - 批量插入数据

### 数据迁移脚本示例

```javascript
// 迁移 students
const students = oldData.students.map((s, index) => ({
    id: index + 1,
    name: s.name,
    phone: s.phone || null,
    email: s.email || null,
    status: s.status || 'active',
    created_at: s.createdAt,
    updated_at: s.createdAt
}));
```

---

## 备份策略

D1 支持自动备份：
- 快照备份：通过 Cloudflare Dashboard
- 导出备份：`wrangler d1 export <database> --file=backup.sql`
- 导入恢复：`wrangler d1 execute <database> --file=backup.sql`

---

## 文件位置

- **Schema SQL**: `docs/database-schema.sql`
- **设计文档**: `docs/database-design.md`
