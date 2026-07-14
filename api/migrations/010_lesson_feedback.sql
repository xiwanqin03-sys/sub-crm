-- 010: 每节课课后反馈结构化字段
-- 正课(非体验课)的课后反馈改为结构化模板

ALTER TABLE classes ADD COLUMN fb_lesson_level TEXT;
ALTER TABLE classes ADD COLUMN fb_unit TEXT;
ALTER TABLE classes ADD COLUMN fb_lesson TEXT;
ALTER TABLE classes ADD COLUMN fb_vocab TEXT;
ALTER TABLE classes ADD COLUMN fb_patterns TEXT;
ALTER TABLE classes ADD COLUMN fb_grammar TEXT;
ALTER TABLE classes ADD COLUMN fb_perf_speaking INTEGER;
ALTER TABLE classes ADD COLUMN fb_perf_pronunciation INTEGER;
ALTER TABLE classes ADD COLUMN fb_perf_comprehension INTEGER;
ALTER TABLE classes ADD COLUMN fb_perf_exercise INTEGER;
ALTER TABLE classes ADD COLUMN fb_highlight TEXT;
ALTER TABLE classes ADD COLUMN fb_practice TEXT;
ALTER TABLE classes ADD COLUMN fb_homework TEXT;
ALTER TABLE classes ADD COLUMN fb_next_preview TEXT;
ALTER TABLE classes ADD COLUMN fb_teacher_message TEXT;
