-- 迁移课时：从 packages 到 students
-- 步骤1: 更新每个学生的 total_hours 和 used_hours

UPDATE students 
SET 
  total_hours = (
    SELECT COALESCE(SUM(p.total), 0) 
    FROM packages p 
    WHERE p.student_id = students.id AND p.status = 'active'
  ),
  used_hours = (
    SELECT COALESCE(SUM(p.used), 0) 
    FROM packages p 
    WHERE p.student_id = students.id AND p.status = 'active'
  );

-- 步骤2: 验证迁移结果
SELECT id, name, total_hours, used_hours FROM students;
