-- 007_org_settlement.sql
-- 机构课时池 + 分配流水 + 周结算单 + 结算明细项

-- ── 1. organizations 加 3 列 ──
ALTER TABLE organizations ADD COLUMN unit_price_cny REAL DEFAULT 80;
ALTER TABLE organizations ADD COLUMN settlement_day TEXT DEFAULT 'monday';
ALTER TABLE organizations ADD COLUMN credit_limit_cny REAL DEFAULT 0; -- 0=不限额(可无限透支)

-- ── 2. 机构课时包 ──
CREATE TABLE IF NOT EXISTS org_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  total_hours REAL NOT NULL,         -- 该包总课时
  used_hours REAL NOT NULL DEFAULT 0,-- 已分配给学生/已被消耗
  unit_price_cny REAL NOT NULL,      -- 购入单价
  amount_cny REAL NOT NULL,          -- 总金额 = total_hours * unit_price_cny
  paid_amount_cny REAL NOT NULL DEFAULT 0, -- 已支付金额
  status TEXT NOT NULL DEFAULT 'pending', -- pending|partial_paid|paid
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS idx_org_packages_org_id ON org_packages(org_id);
CREATE INDEX IF NOT EXISTS idx_org_packages_status ON org_packages(status);

-- ── 3. 课时分配流水（池→学生） ──
CREATE TABLE IF NOT EXISTS org_hour_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  package_id INTEGER,                -- NULL=未关联特定包（允许透支后台补挂）
  student_id INTEGER NOT NULL,
  hours REAL NOT NULL,               -- 正数=加给学生，负数=回收
  notes TEXT,
  created_by TEXT,                   -- 'org_admin'|'super_admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (package_id) REFERENCES org_packages(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
CREATE INDEX IF NOT EXISTS idx_org_alloc_org_id ON org_hour_allocations(org_id);
CREATE INDEX IF NOT EXISTS idx_org_alloc_student_id ON org_hour_allocations(student_id);

-- ── 4. 机构结算单 ──
CREATE TABLE IF NOT EXISTS org_settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  period_start TEXT NOT NULL,        -- ISO 日期
  period_end TEXT NOT NULL,          -- ISO 日期
  total_classes INTEGER NOT NULL DEFAULT 0,
  total_hours REAL NOT NULL DEFAULT 0,
  unit_price_cny REAL NOT NULL,
  amount_due_cny REAL NOT NULL,      -- = total_hours * unit_price_cny
  status TEXT NOT NULL DEFAULT 'pending', -- pending|paid
  paid_at TEXT,
  payment_ref TEXT,                  -- 支付凭证号/备注
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS idx_org_settlements_org_id ON org_settlements(org_id);
CREATE INDEX IF NOT EXISTS idx_org_settlements_status ON org_settlements(status);

-- ── 5. 结算单明细（一节课一行） ──
CREATE TABLE IF NOT EXISTS org_settlement_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  settlement_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  student_id INTEGER,
  student_name TEXT,
  teacher_name TEXT,
  class_date TEXT NOT NULL,
  hours REAL NOT NULL,
  unit_price_cny REAL NOT NULL,
  subtotal_cny REAL NOT NULL,        -- = hours * unit_price_cny
  FOREIGN KEY (settlement_id) REFERENCES org_settlements(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);
CREATE INDEX IF NOT EXISTS idx_org_settlement_items_sid ON org_settlement_items(settlement_id);
