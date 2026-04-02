/**
 * Payments 路由
 * P1: 付款记录 CRUD
 */
import { Hono } from 'hono';
import { paymentSchema, validate, validateParams, idParamSchema } from '../utils/validation.js';
import { success, error, calculatePagination } from '../utils/response.js';

const payments = new Hono();

// 获取所有付款记录
payments.get('/', async (c) => {
  const DB = c.env.DB;
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';

  // 查询总数
  const countResult = await DB.prepare('SELECT COUNT(*) as total FROM payments').first();
  const total = countResult?.total || 0;
  const pagination = calculatePagination(page, pageSize, total);

  const results = await DB.prepare(`
    SELECT p.*, s.name as student_name, pkg.name as package_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    ORDER BY p.date DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(pagination.page_size, pagination.offset).all();

  const data = results.results?.map(payment => ({
    id: payment.id,
    student_id: payment.student_id,
    student_name: payment.student_name,
    amount: payment.amount,
    payment_method: payment.payment_method,
    package_id: payment.package_id,
    package_name: payment.package_name,
    description: payment.description,
    date: payment.date,
    receipt_number: payment.receipt_number,
    created_at: payment.created_at
  })) || [];

  return c.json(success({ data, pagination }));
});

// 获取学生的付款记录
payments.get('/student/:student_id', async (c) => {
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
  const countResult = await DB.prepare('SELECT COUNT(*) as total FROM payments WHERE student_id = ?').bind(studentId).first();
  const total = countResult?.total || 0;
  const pagination = calculatePagination(page, pageSize, total);

  const results = await DB.prepare(`
    SELECT p.*, pkg.name as package_name
    FROM payments p
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE p.student_id = ?
    ORDER BY p.date DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(studentId, pagination.page_size, pagination.offset).all();

  // 计算汇总
  const summary = await DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE student_id = ?
  `).bind(studentId).first();

  const data = results.results?.map(payment => ({
    id: payment.id,
    student_id: payment.student_id,
    amount: payment.amount,
    payment_method: payment.payment_method,
    package_id: payment.package_id,
    package_name: payment.package_name,
    description: payment.description,
    date: payment.date,
    receipt_number: payment.receipt_number,
    notes: payment.notes,
    created_at: payment.created_at,
    _links: {
      self: `/api/v1/payments/${payment.id}`,
      student: `/api/v1/students/${studentId}`,
      package: payment.package_id ? `/api/v1/packages/${payment.package_id}` : null
    }
  })) || [];

  return c.json(success({
    data,
    pagination,
    summary: {
      total: summary?.total || 0
    },
    student: {
      id: student.id,
      name: student.name
    }
  }));
});

// 获取单个付款记录
payments.get('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  const payment = await DB.prepare(`
    SELECT p.*, s.name as student_name, pkg.name as package_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE p.id = ?
  `).bind(id).first();

  if (!payment) {
    return c.json(error('NOT_FOUND', '付款记录不存在'), 404);
  }

  return c.json(success({
    id: payment.id,
    student_id: payment.student_id,
    student_name: payment.student_name,
    amount: payment.amount,
    payment_method: payment.payment_method,
    package_id: payment.package_id,
    package_name: payment.package_name,
    description: payment.description,
    date: payment.date,
    receipt_number: payment.receipt_number,
    notes: payment.notes,
    created_at: payment.created_at,
    _links: {
      self: `/api/v1/payments/${payment.id}`,
      student: `/api/v1/students/${payment.student_id}`,
      package: payment.package_id ? `/api/v1/packages/${payment.package_id}` : null
    }
  }));
});

// 创建付款记录
payments.post('/student/:student_id', validate(paymentSchema), async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');
  const data = c.req.validated;

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 如果有关联课时包，检查是否存在
  if (data.package_id) {
    const pkg = await DB.prepare('SELECT id FROM packages WHERE id = ?').bind(data.package_id).first();
    if (!pkg) {
      return c.json(error('NOT_FOUND', '课时包不存在'), 404);
    }
  }

  // 获取今天日期
  const today = new Date().toISOString().split('T')[0];

  const result = await DB.prepare(`
    INSERT INTO payments (student_id, amount, payment_method, package_id, description, date, receipt_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    studentId,
    data.amount,
    data.payment_method || null,
    data.package_id || null,
    data.description || null,
    data.date || today,
    data.receipt_number || null,
    data.notes || null
  ).run();

  return c.json(success({
    id: result.meta.last_row_id,
    student_id: studentId,
    amount: data.amount,
    date: data.date || today,
    created_at: new Date().toISOString(),
    _links: {
      self: `/api/v1/payments/${result.meta.last_row_id}`,
      student: `/api/v1/students/${studentId}`
    }
  }), 201);
});

// 更新付款记录
payments.patch('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 获取请求体
  const body = await c.req.json();

  // 检查付款记录是否存在
  const existing = await DB.prepare('SELECT id FROM payments WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '付款记录不存在'), 404);
  }

  // 构建更新语句
  const fields = [];
  const values = [];

  const allowedFields = ['amount', 'payment_method', 'package_id', 'description', 'date', 'receipt_number', 'notes'];
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length > 0) {
    values.push(id);
    await DB.prepare(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  // 返回更新后的记录
  const payment = await DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();

  return c.json(success({
    id: payment.id,
    amount: payment.amount,
    updated_at: payment.created_at,
    _links: {
      self: `/api/v1/payments/${payment.id}`
    }
  }));
});

// 删除付款记录
payments.delete('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 检查付款记录是否存在
  const existing = await DB.prepare('SELECT id FROM payments WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '付款记录不存在'), 404);
  }

  await DB.prepare('DELETE FROM payments WHERE id = ?').bind(id).run();

  return c.body(null, 204);
});

export default payments;