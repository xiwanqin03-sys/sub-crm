-- 014: 课程反馈新增 page_from/page_to 字段
-- 用于在家长端显示该节课的 PDF 页面图 (从 R2 取 page-img/<code>/<num>/<page>)

-- classes 表新增字段: page_from, page_to (整数)
-- 表示该节课覆盖的 textbook 页码 (与 textbook_code/unit_number 配合使用)
ALTER TABLE classes ADD COLUMN page_from INTEGER;
ALTER TABLE classes ADD COLUMN page_to INTEGER;
