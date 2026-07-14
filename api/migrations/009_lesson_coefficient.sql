-- 009: 课时系数可配置 + 教师按次数结算
-- 25分钟课时不固定为0.5, 改为可配置系数(默认0.66)

-- 1. teachers 表新增25分钟单价 (已有 hourly_rate 作为50分钟单价)
ALTER TABLE teachers ADD COLUMN hourly_rate_25 REAL DEFAULT 80;

-- 2. organizations 表新增25分钟机构结算单价
ALTER TABLE organizations ADD COLUMN unit_price_25_cny REAL DEFAULT 50;

-- 3. settings 表新增全局默认25分钟课时系数
INSERT INTO settings (key, value, updated_at) VALUES
  ('short_class_coefficient', '0.66', datetime('now'))
ON CONFLICT(key) DO NOTHING;

-- 4. organizations 表新增可选的系数覆盖 (NULL则用settings全局值)
ALTER TABLE organizations ADD COLUMN short_class_coefficient REAL;

-- 5. teacher_payments 表增加按次结算字段
ALTER TABLE teacher_payments ADD COLUMN count_50min INTEGER DEFAULT 0;
ALTER TABLE teacher_payments ADD COLUMN count_25min INTEGER DEFAULT 0;
ALTER TABLE teacher_payments ADD COLUMN rate_50min REAL;
ALTER TABLE teacher_payments ADD COLUMN rate_25min REAL;

-- 6. org_settlement_items 明细增加课时类型
ALTER TABLE org_settlement_items ADD COLUMN duration_type TEXT;
