ALTER TABLE students ADD COLUMN access_token TEXT UNIQUE;
UPDATE students SET access_token = hex(randomblob(16)) WHERE access_token IS NULL OR access_token = '';
CREATE INDEX IF NOT EXISTS idx_students_access_token ON students (access_token);
