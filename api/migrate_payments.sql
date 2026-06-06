-- 迁移 payments 表，允许金额为 0 和新增 'gift' 支付方式

-- 1. 创建新表
CREATE TABLE IF NOT EXISTS payments_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    payment_method TEXT CHECK (payment_method IN ('cash', 'wechat', 'alipay', 'bank', 'other', 'gift')),
    package_id INTEGER,
    description TEXT,
    date TEXT NOT NULL DEFAULT (date('now')),
    receipt_number TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- 2. 复制数据
INSERT INTO payments_new SELECT * FROM payments;

-- 3. 删除旧表
DROP TABLE payments;

-- 4. 重命名新表
ALTER TABLE payments_new RENAME TO payments;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments (student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (date);
CREATE INDEX IF NOT EXISTS idx_payments_package_id ON payments (package_id);
