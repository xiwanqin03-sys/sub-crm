/**
 * Classes 路由
 * P1: 上课记录 CRUD
 */
import { Hono } from 'hono';
import { classSchema, classUpdateSchema, validate, validateParams, idParamSchema, paginationSchema, validateQuery } from '../utils/validation.js';
import { success, error, calculatePagination } from '../utils/response.js';

const classes = new Hono();

// 获取所有上课记录（支持过滤）
classes.get('/', async (c) => {
  const DB = c.env.DB;
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';
  const studentId = c.req.query('student_id');
  const teacherId = c.req.query('teacher_id');
  const status = c.req.query('status');

  // 构建查询条件
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (studentId) {
    whereClause += ' AND c.student_id = ?';
    params.push(studentId);
  }

  if (teacherId) {
    whereClause += ' AND c.teacher_id = ?';
    params.push(teacherId);
  }

  if (status) {
    whereClause += ' AND c.status = ?';
    params.push(status);
  }

  // 统计总数
  const countResult = await DB.prepare(`SELECT COUNT(*) as total FROM classes c ${whereClause}`).bind(...params).first();
  const total = countResult?.total || 0;
  const pagination = calculatePagination(page, pageSize, total);

  // 查询数据
  const results = await DB.prepare(`
    SELECT c.*, s.name as student_name, p.name as package_name, t.name as teacher_name
    FROM classes c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN packages p ON c.package_id = p.id
    LEFT JOIN teachers t ON c.teacher_id = t.id
    ${whereClause}
    ORDER BY c.date DESC, c.start_time DESC
    LIMIT ? OFFSET ?
  `).bind(...params, pagination.page_size, pagination.offset).all();

const data = results.results?.map(cls => ({
  id: cls.id,
  student_id: cls.student_id,
  student_name: cls.student_name,
  package_id: cls.package_id,
  package_name: cls.package_name,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  teacher_name: cls.teacher_name,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  status: cls.status,
  class_link: cls.class_link,
  created_at: cls.created_at,
  updated_at: cls.updated_at
})) || [];

  return c.json(success({ data, pagination }));
});

// 获取学生的上课记录
classes.get('/student/:student_id', async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id, name FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 查询总数
  const countResult = await DB.prepare('SELECT COUNT(*) as total FROM classes WHERE student_id = ?').bind(studentId).first();
  const total = countResult?.total || 0;
  const pagination = calculatePagination(page, pageSize, total);

  const results = await DB.prepare(`
    SELECT c.*, p.name as package_name
    FROM classes c
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE c.student_id = ?
    ORDER BY c.date DESC, c.start_time DESC
    LIMIT ? OFFSET ?
  `).bind(studentId, pagination.page_size, pagination.offset).all();

const data = results.results?.map(cls => ({
  id: cls.id,
  student_id: cls.student_id,
  package_id: cls.package_id,
  package_name: cls.package_name,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  class_link: cls.class_link,
  status: cls.status,
  created_at: cls.created_at,
  updated_at: cls.updated_at
 })) || [];

  return c.json(success({ data, pagination }));
});

// 获取单个上课记录
classes.get('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  const cls = await DB.prepare(`
    SELECT c.*, s.name as student_name, p.name as package_name, t.name as teacher_name
    FROM classes c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN packages p ON c.package_id = p.id
    LEFT JOIN teachers t ON c.teacher_id = t.id
    WHERE c.id = ?
  `).bind(id).first();

  if (!cls) {
    return c.json(error('NOT_FOUND', '上课记录不存在'), 404);
  }

return c.json(success({
  id: cls.id,
  student_id: cls.student_id,
  student_name: cls.student_name,
  package_id: cls.package_id,
  package_name: cls.package_name,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  teacher_name: cls.teacher_name,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  class_link: cls.class_link,
  status: cls.status,
  created_at: cls.created_at,
  updated_at: cls.updated_at
 }));
});

// 创建上课记录（指定学生）
classes.post('/student/:student_id', validate(classSchema), async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');
  const data = c.req.validated;

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id, name FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 如果指定了课时包，检查是否属于该学生
  if (data.package_id) {
    const pkg = await DB.prepare('SELECT id, student_id FROM packages WHERE id = ?').bind(data.package_id).first();
    if (!pkg || pkg.student_id !== parseInt(studentId)) {
      return c.json(error('INVALID_PACKAGE', '课时包不存在或不属于该学生'), 400);
    }
  }

  const result = await DB.prepare(`
    INSERT INTO classes (student_id, package_id, teacher, teacher_id, subject, hours, date, start_time, end_time, content, homework, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    studentId,
    data.package_id || null,
    data.teacher || null,
    data.teacher_id || null,
    data.subject || null,
    data.hours || 1,
    data.date || new Date().toISOString().split('T')[0],
    data.start_time || null,
    data.end_time || null,
    data.content || null,
    data.homework || null,
    data.notes || null,
    data.status || 'completed'
  ).run();

  return c.json(success({
    id: result.meta.last_row_id,
    student_id: parseInt(studentId),
    package_id: data.package_id || null,
    teacher: data.teacher || null,
    teacher_id: data.teacher_id || null,
    subject: data.subject || null,
    hours: data.hours || 1,
    date: data.date || new Date().toISOString().split('T')[0],
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    content: data.content || null,
    homework: data.homework || null,
    notes: data.notes || null,
    status: data.status || 'completed',
    created_at: new Date().toISOString()
  }), 201);
});

// 更新上课记录
classes.patch('/:id', validateParams(idParamSchema), validate(classUpdateSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;
  const data = c.req.validated;

  // 检查上课记录是否存在
  const existing = await DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '上课记录不存在'), 404);
  }

  // 构建更新语句
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await DB.prepare(`UPDATE classes SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  // 返回更新后的记录
  const cls = await DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
return c.json(success({
  id: cls.id,
  student_id: cls.student_id,
  package_id: cls.package_id,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  status: cls.status,
  class_link: cls.class_link,
  updated_at: cls.updated_at
 }));
});

 // 删除上课记录
classes.delete('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 检查上课记录是否存在
  const cls = await DB.prepare('SELECT id FROM classes WHERE id = ?').bind(id).first();
  if (!cls) {
    return c.json(error('NOT_FOUND', '上课记录不存在'), 404);
  }

  await DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();

  return c.json(success({ message: '上课记录已删除' }));
});

export default classes;
