-- 教师薪资结算表
CREATE TABLE IF NOT EXISTS teacher_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    period_start TEXT NOT NULL,  -- 周开始日期 YYYY-MM-DD
    period_end TEXT NOT NULL,    -- 周结束日期 YYYY-MM-DD
    total_classes INTEGER NOT NULL DEFAULT 0,
    total_hours REAL NOT NULL DEFAULT 0,
    hourly_rate REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teacher_payments_teacher_id ON teacher_payments (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_period ON teacher_payments (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_status ON teacher_payments (status);
