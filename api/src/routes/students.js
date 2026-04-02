/**
 * Students 路由
 * P0: 核心 CRUD 功能
 */
import { Hono } from 'hono';
import { studentSchema, studentUpdateSchema, studentQuerySchema, validate, validateQuery, validateParams, idParamSchema } from '../utils/validation.js';
import { success, paginated, error, calculatePagination } from '../utils/response.js';

const students = new Hono();

// 获取学生列表
students.get('/list', validateQuery(studentQuerySchema), async (c) => {
  const DB = c.env.DB;
  const { page, page_size, search, status, sort, order } = c.req.validatedQuery;

  const pagination = calculatePagination(page, page_size, 0);

  // 构建查询
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (s.name LIKE ? OR s.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClause += ' AND s.status = ?';
    params.push(status);
  }

  // 排序
  const sortField = sort || 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  const validSortFields = ['id', 'name', 'created_at', 'updated_at', 'status'];
  const safeSortField = validSortFields.includes(sortField) ? sortField : 'created_at';

  // 查询总数
  const countSql = `SELECT COUNT(*) as total FROM students s ${whereClause}`;
  const countResult = await DB.prepare(countSql).bind(...params).first();
  const total = countResult?.total || 0;

  // 重新计算分页
  const finalPagination = calculatePagination(page, page_size, total);

  // 查询列表
  const sql = `
    SELECT s.*,
      COALESCE(SUM(p.total), 0) as total_hours,
      COALESCE(SUM(p.used), 0) as used_hours,
      COALESCE(SUM(p.remaining), 0) as remaining_hours
    FROM students s
    LEFT JOIN packages p ON s.id = p.student_id AND p.status = 'active'
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.${safeSortField} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const results = await DB.prepare(sql).bind(...params, finalPagination.page_size, finalPagination.offset).all();

  const data = results.results?.map(student => ({
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    age: student.age,
    grade: student.grade,
    parent_name: student.parent_name,
    notes: student.notes,
    status: student.status,
    package_summary: {
      total_hours: student.total_hours,
      used_hours: student.used_hours,
      remaining_hours: student.remaining_hours
    },
    created_at: student.created_at,
    updated_at: student.updated_at,
    _links: {
      self: `/api/v1/students/${student.id}`,
      packages: `/api/v1/students/${student.id}/packages`,
      classes: `/api/v1/students/${student.id}/classes`,
      payments: `/api/v1/students/${student.id}/payments`
    }
  })) || [];

  return c.json(success(paginated(data, finalPagination, '/api/v1/students/list')));
});

// 获取单个学生
students.get('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 查询学生信息
  const student = await DB.prepare(`
    SELECT s.*,
      COALESCE(SUM(p.total), 0) as total_hours,
      COALESCE(SUM(p.used), 0) as used_hours,
      COALESCE(SUM(p.remaining), 0) as remaining_hours
    FROM students s
    LEFT JOIN packages p ON s.id = p.student_id AND p.status = 'active'
    WHERE s.id = ?
    GROUP BY s.id
  `).bind(id).first();

  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 查询课时包
  const packages = await DB.prepare(`
    SELECT * FROM packages
    WHERE student_id = ? AND status = 'active'
    ORDER BY created_at DESC
  `).bind(id).all();

  // 查询上课统计
  const classStats = await DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN strftime('%Y-%m', date) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) as this_month
    FROM classes
    WHERE student_id = ? AND status = 'completed'
  `).bind(id).first();

  // 查询付款统计
  const paymentStats = await DB.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as total,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', date) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as this_month
    FROM payments
    WHERE student_id = ?
  `).bind(id).first();

  return c.json(success({
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    age: student.age,
    grade: student.grade,
    parent_name: student.parent_name,
    notes: student.notes,
    status: student.status,
    package_summary: {
      total_hours: student.total_hours,
      used_hours: student.used_hours,
      remaining_hours: student.remaining_hours,
      packages: packages.results?.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        remaining: pkg.remaining,
        expire_date: pkg.expire_date
      })) || []
    },
    class_stats: {
      total: classStats?.total || 0,
      this_month: classStats?.this_month || 0
    },
    payment_stats: {
      total: paymentStats?.total || 0,
      this_month: paymentStats?.this_month || 0
    },
    created_at: student.created_at,
    updated_at: student.updated_at,
    _links: {
      self: `/api/v1/students/${student.id}`,
      packages: `/api/v1/students/${student.id}/packages`,
      classes: `/api/v1/students/${student.id}/classes`,
      payments: `/api/v1/students/${student.id}/payments`
    }
  }));
});

// 创建学生
students.post('/', validate(studentSchema), async (c) => {
  const DB = c.env.DB;
  const data = c.req.validated;

  const result = await DB.prepare(`
    INSERT INTO students (name, phone, email, age, grade, parent_name, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.name,
    data.phone || null,
    data.email || null,
    data.age || null,
    data.grade || null,
    data.parent_name || null,
    data.notes || null,
    data.status || 'active'
  ).run();

  return c.json(success({
    id: result.meta.last_row_id,
    name: data.name,
    status: data.status || 'active',
    created_at: new Date().toISOString(),
    _links: {
      self: `/api/v1/students/${result.meta.last_row_id}`
    }
  }), 201);
});

// 更新学生
students.patch('/:id', validateParams(idParamSchema), validate(studentUpdateSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;
  const data = c.req.validated;

  // 检查学生是否存在
  const existing = await DB.prepare('SELECT id FROM students WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 构建更新语句
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length > 0) {
    await DB.prepare(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }

  // 返回更新后的学生
  const student = await DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();

  return c.json(success({
    id: student.id,
    name: student.name,
    status: student.status,
    updated_at: student.updated_at,
    _links: {
      self: `/api/v1/students/${student.id}`
    }
  }));
});

// 删除学生
students.delete('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 检查学生是否存在
  const existing = await DB.prepare('SELECT id FROM students WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 删除（级联删除会自动处理关联的 packages, classes, payments）
  await DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();

  return c.body(null, 204);
});

// 兼容路由：GET /students 等同于 GET /students/list
students.get('/', async (c) => {
  const DB = c.env.DB;

  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';
  const search = c.req.query('search');
  const status = c.req.query('status');

  const pagination = calculatePagination(page, pageSize, 0);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (s.name LIKE ? OR s.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClause += ' AND s.status = ?';
    params.push(status);
  }

  const countSql = `SELECT COUNT(*) as total FROM students s ${whereClause}`;
  const countResult = await DB.prepare(countSql).bind(...params).first();
  const total = countResult?.total || 0;

  const finalPagination = calculatePagination(page, pageSize, total);

  const sql = `
    SELECT s.*,
      COALESCE(SUM(p.total), 0) as total_hours,
      COALESCE(SUM(p.used), 0) as used_hours,
      COALESCE(SUM(p.remaining), 0) as remaining_hours
    FROM students s
    LEFT JOIN packages p ON s.id = p.student_id AND p.status = 'active'
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const results = await DB.prepare(sql).bind(...params, finalPagination.page_size, finalPagination.offset).all();

  const data = results.results?.map(student => ({
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    age: student.age,
    grade: student.grade,
    parent_name: student.parent_name,
    notes: student.notes,
    status: student.status,
    package_summary: {
      total_hours: student.total_hours,
      used_hours: student.used_hours,
      remaining_hours: student.remaining_hours
    },
    created_at: student.created_at,
    updated_at: student.updated_at,
    _links: {
      self: `/api/v1/students/${student.id}`,
      packages: `/api/v1/students/${student.id}/packages`,
      classes: `/api/v1/students/${student.id}/classes`,
      payments: `/api/v1/students/${student.id}/payments`
    }
  })) || [];

  return c.json(success(paginated(data, finalPagination, '/api/v1/students')));
});

export default students;