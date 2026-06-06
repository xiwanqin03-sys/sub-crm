-- 添加 payment_method 字段到 teacher_payments 表
ALTER TABLE teacher_payments ADD COLUMN payment_method TEXT CHECK (payment_method IN ('cash', 'wechat', 'alipay', 'bank', 'other'));
