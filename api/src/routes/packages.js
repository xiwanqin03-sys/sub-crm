/**
 * Packages 路由
 * P0: 核心 CRUD 功能
 */
import { Hono } from 'hono';
import { packageSchema, packageUpdateSchema, packageAdjustSchema, validate, validateParams, idParamSchema } from '../utils/validation.js';
import { success, error } from '../utils/response.js';

const packages = new Hono();

// 获取所有课时包列表
packages.get('/', async (c) => {
  const DB = c.env.DB;
  const results = await DB.prepare(`
    SELECT p.*, s.name as student_name
    FROM packages p
    JOIN students s ON p.student_id = s.id
    ORDER BY p.created_at DESC
  `).all();

  const data = results.results?.map(pkg => ({
    id: pkg.id,
    student_id: pkg.student_id,
    student_name: pkg.student_name,
    name: pkg.name,
    total: pkg.total,
    used: pkg.used,
    remaining: pkg.remaining,
    price: pkg.price,
    purchase_date: pkg.purchase_date,
    expire_date: pkg.expire_date,
    status: pkg.status,
    created_at: pkg.created_at,
    _links: {
      self: `/api/v1/packages/${pkg.id}`,
      student: `/api/v1/students/${pkg.student_id}`
    }
  })) || [];

  return c.json(success({ data }));
});

// 获取学生的课时包列表
packages.get('/student/:student_id', async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id, name FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  const results = await DB.prepare(`
    SELECT * FROM packages
    WHERE student_id = ?
    ORDER BY created_at DESC
  `).bind(studentId).all();

  // 计算汇总
  const summary = {
    total_hours: 0,
    used_hours: 0,
    remaining_hours: 0
  };

  const data = results.results?.map(pkg => {
    summary.total_hours += pkg.total;
    summary.used_hours += pkg.used;
    summary.remaining_hours += pkg.remaining;
    return {
      id: pkg.id,
      student_id: pkg.student_id,
      name: pkg.name,
      total: pkg.total,
      used: pkg.used,
      remaining: pkg.remaining,
      price: pkg.price,
      purchase_date: pkg.purchase_date,
      expire_date: pkg.expire_date,
      notes: pkg.notes,
      status: pkg.status,
      created_at: pkg.created_at,
      updated_at: pkg.updated_at,
      _links: {
        self: `/api/v1/packages/${pkg.id}`,
        student: `/api/v1/students/${studentId}`
      }
    };
  }) || [];

  return c.json(success({ data, summary }));
});

// 获取单个课时包
packages.get('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  const pkg = await DB.prepare(`
    SELECT p.*, s.name as student_name
    FROM packages p
    JOIN students s ON p.student_id = s.id
    WHERE p.id = ?
  `).bind(id).first();

  if (!pkg) {
    return c.json(error('NOT_FOUND', '课时包不存在'), 404);
  }

  return c.json(success({
    id: pkg.id,
    student_id: pkg.student_id,
    student_name: pkg.student_name,
    name: pkg.name,
    total: pkg.total,
    used: pkg.used,
    remaining: pkg.remaining,
    price: pkg.price,
    purchase_date: pkg.purchase_date,
    expire_date: pkg.expire_date,
    notes: pkg.notes,
    status: pkg.status,
    created_at: pkg.created_at,
    updated_at: pkg.updated_at,
    _links: {
      self: `/api/v1/packages/${pkg.id}`,
      student: `/api/v1/students/${pkg.student_id}`
    }
  }));
});

// 创建课时包
packages.post('/student/:student_id', validate(packageSchema), async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');
  const data = c.req.validated;

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 计算剩余课时（初始等于总课时）
  const remaining = data.total;

  const result = await DB.prepare(`
    INSERT INTO packages (student_id, name, total, used, remaining, price, purchase_date, expire_date, notes, status)
    VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
  `).bind(
    studentId,
    data.name || `${data.total}节套餐`,
    data.total,
    remaining,
    data.price || null,
    data.purchase_date || new Date().toISOString().split('T')[0],
    data.expire_date || null,
    data.notes || null,
    data.status || 'active'
  ).run();

  return c.json(success({
    id: result.meta.last_row_id,
    student_id: studentId,
    name: data.name || `${data.total}节套餐`,
    total: data.total,
    remaining: remaining,
    status: data.status || 'active',
    created_at: new Date().toISOString(),
    _links: {
      self: `/api/v1/packages/${result.meta.last_row_id}`,
      student: `/api/v1/students/${studentId}`
    }
  }), 201);
});

// 更新课时包
packages.patch('/:id', validateParams(idParamSchema), validate(packageUpdateSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;
  const data = c.req.validated;

  // 检查课时包是否存在
  const existing = await DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '课时包不存在'), 404);
  }

  // 如果更新了 total 或 used，需要重新计算 remaining
  const total = data.total !== undefined ? data.total : existing.total;
  const used = data.used !== undefined ? data.used : existing.used;
  const remaining = total - used;

  // 构建更新语句
  const fields = ['used = ?', 'remaining = ?'];
  const values = [used, remaining];

  for (const [key, value] of Object.entries(data)) {
    if (key !== 'total' && key !== 'used') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  // 确保 total 在最后更新
  if (data.total !== undefined) {
    fields.push('total = ?');
    values.push(data.total);
  }

  values.push(id);

  await DB.prepare(`UPDATE packages SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  // 返回更新后的课时包
  const pkg = await DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();
  return c.json(success({
    id: pkg.id,
    name: pkg.name,
    total: pkg.total,
    used: pkg.used,
    remaining: pkg.remaining,
    status: pkg.status,
    updated_at: pkg.updated_at,
    _links: {
      self: `/api/v1/packages/${pkg.id}`
    }
  }));
});

// 删除课时包
packages.delete('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 检查课时包是否存在
  const existing = await DB.prepare('SELECT id FROM packages WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '课时包不存在'), 404);
  }

  await DB.prepare('DELETE FROM packages WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

// 调整课时（管理员使用）
packages.post('/:id/adjust', validateParams(idParamSchema), validate(packageAdjustSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;
  const { adjustment, reason, notes } = c.req.validated;

  // 检查课时包是否存在
  const existing = await DB.prepare(`
    SELECT p.*, s.name as student_name
    FROM packages p
    JOIN students s ON p.student_id = s.id
    WHERE p.id = ?
  `).bind(id).first();

  if (!existing) {
    return c.json(error('NOT_FOUND', '课时包不存在'), 404);
  }

  // 计算新的课时数
  const newTotal = existing.total + adjustment;
  if (newTotal < existing.used) {
    return c.json(error('INVALID_ADJUSTMENT', '调整后总课时不能小于已用课时'), 400);
  }

  const newRemaining = newTotal - existing.used;

  // 更新课时包
  await DB.prepare(`
    UPDATE packages
    SET total = ?, remaining = ?, updated_at = ?
    WHERE id = ?
  `).bind(newTotal, newRemaining, new Date().toISOString(), id).run();

  return c.json(success({
    id,
    student_id: existing.student_id,
    student_name: existing.student_name,
    package_name: existing.name,
    previous_total: existing.total,
    adjustment,
    new_total: newTotal,
    used: existing.used,
    new_remaining: newRemaining,
    reason,
    notes,
    adjusted_at: new Date().toISOString()
  }));
});

export default packages;
