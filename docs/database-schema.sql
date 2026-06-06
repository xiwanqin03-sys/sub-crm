-- Sunnybridge CRM Database Schema for Cloudflare D1
-- SQLite 语法，遵循 PostgreSQL 技能设计原则

-- ============================================
-- 1. Students 表（学生信息）
-- ============================================
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    age INTEGER CHECK (age >= 0 AND age <= 120),
    grade TEXT,                          -- 年级
    parent_name TEXT,                    -- 家长姓名
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 索引：搜索和筛选
CREATE INDEX idx_students_name ON students (name);
CREATE INDEX idx_students_phone ON students (phone);
CREATE INDEX idx_students_status ON students (status);
CREATE INDEX idx_students_created_at ON students (created_at);

-- ============================================
-- 2. Packages 表（课时包）
-- ============================================
CREATE TABLE packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    name TEXT,                           -- 课时包名称（如"60节套餐"）
    total INTEGER NOT NULL CHECK (total > 0),      -- 总课时
    used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),   -- 已用课时
    remaining INTEGER NOT NULL DEFAULT 0,          -- 剩余课时（computed）
    price REAL CHECK (price >= 0),                 -- 购买价格
    purchase_date TEXT NOT NULL DEFAULT (datetime('now')),
    expire_date TEXT,                   -- 过期日期（可选）
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'refunded')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 索引：外键和常用查询
CREATE INDEX idx_packages_student_id ON packages (student_id);
CREATE INDEX idx_packages_status ON packages (status);
CREATE INDEX idx_packages_expire_date ON packages (expire_date);

-- ============================================
-- 3. Classes 表（上课记录）
-- ============================================
CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    package_id INTEGER,                  -- 关联课时包（可选）
    teacher TEXT,                        -- 授课教师
    subject TEXT,                        -- 科目
    hours REAL NOT NULL DEFAULT 1 CHECK (hours > 0),  -- 课时数（支持小数）
    date TEXT NOT NULL DEFAULT (date('now')),  -- 上课日期
    start_time TEXT,                     -- 开始时间
    end_time TEXT,                       -- 结束时间
    content TEXT,                        -- 上课内容
    homework TEXT,                       -- 课后作业
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'absent')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- 索引：外键和常用查询
CREATE INDEX idx_classes_student_id ON classes (student_id);
CREATE INDEX idx_classes_package_id ON classes (package_id);
CREATE INDEX idx_classes_date ON classes (date);
CREATE INDEX idx_classes_status ON classes (status);
CREATE INDEX idx_classes_teacher ON classes (teacher);

-- ============================================
-- 4. Payments 表（付款记录）
-- ============================================
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),       -- 付款金额
    payment_method TEXT CHECK (payment_method IN ('cash', 'wechat', 'alipay', 'bank', 'other')),
    package_id INTEGER,                  -- 关联课时包（可选）
    description TEXT,                    -- 付款说明
    date TEXT NOT NULL DEFAULT (date('now')),
    receipt_number TEXT,                 -- 收据编号
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- 索引：外键和常用查询
CREATE INDEX idx_payments_student_id ON payments (student_id);
CREATE INDEX idx_payments_date ON payments (date);
CREATE INDEX idx_payments_package_id ON payments (package_id);

-- ============================================
-- 5. Teachers 表（教师信息）- 新增
-- ============================================
CREATE TABLE teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    subjects TEXT,                       -- 教授科目（JSON 数组）
    hourly_rate REAL CHECK (hourly_rate >= 0),  -- 时薪
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_teachers_name ON teachers (name);
CREATE INDEX idx_teachers_status ON teachers (status);

-- ============================================
-- 6. Settings 表（系统设置）
-- ============================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 初始化默认设置
INSERT INTO settings (key, value) VALUES 
    ('school_name', '阳光桥在线英语'),
    ('currency', 'CNY'),
    ('timezone', 'Asia/Shanghai');

-- ============================================
-- 7. 触发器：自动更新 updated_at
-- ============================================
CREATE TRIGGER update_students_timestamp 
AFTER UPDATE ON students
BEGIN
    UPDATE students SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_packages_timestamp 
AFTER UPDATE ON packages
BEGIN
    UPDATE packages SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_classes_timestamp 
AFTER UPDATE ON classes
BEGIN
    UPDATE classes SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_teachers_timestamp 
AFTER UPDATE ON teachers
BEGIN
    UPDATE teachers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- 8. 触发器：上课后自动扣减课时
-- ============================================
CREATE TRIGGER deduct_hours_after_class
AFTER INSERT ON classes
WHEN NEW.package_id IS NOT NULL AND NEW.status = 'completed'
BEGIN
    UPDATE packages 
    SET used = used + NEW.hours,
        remaining = total - (used + NEW.hours),
        updated_at = datetime('now')
    WHERE id = NEW.package_id;
END;

-- 课时恢复（取消课程）
CREATE TRIGGER restore_hours_after_cancel
AFTER UPDATE ON classes
WHEN OLD.status = 'completed' AND NEW.status = 'cancelled' AND OLD.package_id IS NOT NULL
BEGIN
    UPDATE packages 
    SET used = used - OLD.hours,
        remaining = total - (used - OLD.hours),
        updated_at = datetime('now')
    WHERE id = OLD.package_id;
END;

-- ============================================
-- 9. 视图：学生课时汇总
-- ============================================
CREATE VIEW student_package_summary AS
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    COUNT(DISTINCT p.id) AS package_count,
    SUM(p.total) AS total_hours,
    SUM(p.used) AS used_hours,
    SUM(p.remaining) AS remaining_hours,
    s.status
FROM students s
LEFT JOIN packages p ON s.id = p.student_id AND p.status = 'active'
GROUP BY s.id;

-- ============================================
-- 10. 视图：月度统计
-- ============================================
CREATE VIEW monthly_stats AS
SELECT 
    strftime('%Y-%m', date) AS month,
    COUNT(*) AS class_count,
    SUM(hours) AS total_hours,
    COUNT(DISTINCT student_id) AS active_students
FROM classes
WHERE status = 'completed'
GROUP BY strftime('%Y-%m', date)
ORDER BY month DESC;

-- ============================================
-- 11. 视图：收入统计
-- ============================================
CREATE VIEW monthly_revenue AS
SELECT 
    strftime('%Y-%m', date) AS month,
    COUNT(*) AS payment_count,
    SUM(amount) AS total_revenue
FROM payments
GROUP BY strftime('%Y-%m', date)
ORDER BY month DESC;
