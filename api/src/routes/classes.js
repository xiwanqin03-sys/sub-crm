/**
 * Classes 路由
 * P1: 上课记录 CRUD
 */
import { Hono } from 'hono';
import { classSchema, classUpdateSchema, validate, validateParams, idParamSchema, paginationSchema, validateQuery } from '../utils/validation.js';
import { success, error, calculatePagination } from '../utils/response.js';

const classes = new Hono();

// 获取所有上课记录
classes.get('/', async (c) => {
  const DB = c.env.DB;
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';

  const countResult = await DB.prepare('SELECT COUNT(*) as total FROM classes').first();
  const total = countResult?.total || 0;
  const pagination = calculatePagination(page, pageSize, total);

  const results = await DB.prepare(`
    SELECT c.*, s.name as student_name, p.name as package_name, t.name as teacher_name
    FROM classes c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN packages p ON c.package_id = p.id
    LEFT JOIN teachers t ON c.teacher_id = t.id
    ORDER BY c.date DESC, c.start_time DESC
    LIMIT ? OFFSET ?
  `).bind(pagination.page_size, pagination.offset).all();

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
    subject: cls.subject,
    hours: cls.hours,
    date: cls.date,
    start_time: cls.start_time,
    end_time: cls.end_time,
    content: cls.content,
    homework: cls.homework,
    notes: cls.notes,
    status: cls.status,
    created_at: cls.created_at,
    updated_at: cls.updated_at,
    _links: {
      self: `/api/v1/classes/${cls.id}`,
      student: `/api/v1/students/${studentId}`,
      package: cls.package_id ? `/api/v1/packages/${cls.package_id}` : null
    }
  })) || [];

  return c.json(success({ data, pagination, student: { id: student.id, name: student.name } }));
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
    status: cls.status,
    created_at: cls.created_at,
    updated_at: cls.updated_at,
    _links: {
      self: `/api/v1/classes/${cls.id}`,
      student: `/api/v1/students/${cls.student_id}`,
      package: cls.package_id ? `/api/v1/packages/${cls.package_id}` : null
    }
  }));
});

// 创建上课记录
classes.post('/student/:student_id', validate(classSchema), async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');
  const data = c.req.validated;

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 如果有关联课时包，检查课时包是否存在且状态为 active
  if (data.package_id) {
    const pkg = await DB.prepare('SELECT id, remaining, status FROM packages WHERE id = ?').bind(data.package_id).first();
    if (!pkg) {
      return c.json(error('NOT_FOUND', '课时包不存在'), 404);
    }
    if (pkg.status !== 'active') {
      return c.json(error('PACKAGE_EXPIRED', '课时包已过期或已退款'), 400);
    }
  }

  // 获取今天日期
  const today = new Date().toISOString().split('T')[0];

  const result = await DB.prepare(`
    INSERT INTO classes (student_id, package_id, teacher_id, teacher, subject, hours, date, start_time, end_time, content, homework, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    studentId,
    data.package_id || null,
    data.teacher_id || null,
    data.teacher || null,
    data.subject || null,
    data.hours || 1,
    data.date || today,
    data.start_time || null,
    data.end_time || null,
    data.content || null,
    data.homework || null,
    data.notes || null,
    data.status || 'completed'
  ).run();

  const newId = result.meta.last_row_id;

  // 如果是已完成状态且有关联课时包，自动扣减课时
  if (data.status === 'completed' && data.package_id) {
    await DB.prepare(`
      UPDATE packages SET used = used + ?, remaining = remaining - ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(data.hours || 1, data.hours || 1, data.package_id).run();
  }

  return c.json(success({
    id: newId,
    student_id: studentId,
    hours: data.hours || 1,
    status: data.status || 'completed',
    created_at: new Date().toISOString(),
    _links: {
      self: `/api/v1/classes/${newId}`,
      student: `/api/v1/students/${studentId}`
    }
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

  const oldStatus = existing.status;
  const oldHours = existing.hours;
  const oldPackageId = existing.package_id;
  const newStatus = data.status !== undefined ? data.status : oldStatus;
  const newHours = data.hours !== undefined ? data.hours : oldHours;
  const newPackageId = data.package_id !== undefined ? data.package_id : oldPackageId;

  // 构建更新语句
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  // 添加 updated_at
  fields.push("updated_at = datetime('now')");

  if (fields.length > 0) {
    await DB.prepare(`UPDATE classes SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }

  // 处理状态变化导致的课时调整
  if (oldPackageId && oldStatus === 'completed' && newStatus !== 'completed') {
    // 恢复课时
    await DB.prepare(`
      UPDATE packages SET used = used - ?, remaining = remaining + ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(oldHours, oldHours, oldPackageId).run();
  } else if (newPackageId && newStatus === 'completed' && oldStatus !== 'completed') {
    // 扣减新课时包
    const pkg = await DB.prepare('SELECT remaining, status FROM packages WHERE id = ?').bind(newPackageId).first();
    if (pkg && pkg.status === 'active' && pkg.remaining >= newHours) {
      await DB.prepare(`
        UPDATE packages SET used = used + ?, remaining = remaining - ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newHours, newHours, newPackageId).run();
    }
  }

  // 返回更新后的记录
  const cls = await DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  return c.json(success({
    id: cls.id,
    status: cls.status,
    updated_at: cls.updated_at,
    _links: { self: `/api/v1/classes/${cls.id}` }
  }));
});

// 删除上课记录
classes.delete('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 检查上课记录是否存在
  const existing = await DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '上课记录不存在'), 404);
  }

  // 如果已完成且有关联课时包，恢复课时
  if (existing.status === 'completed' && existing.package_id) {
    await DB.prepare(`
      UPDATE packages SET used = used - ?, remaining = remaining + ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(existing.hours, existing.hours, existing.package_id).run();
  }

  await DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

export default classes;
