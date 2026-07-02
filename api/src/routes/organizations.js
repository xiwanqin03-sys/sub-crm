import { Hono } from 'hono';
import { success, error } from '../utils/response.js';

/**
 * Organizations 路由
 * 管理合作机构（校区/代理）
 */
const organizations = new Hono();

// 获取所有机构列表
organizations.get('/', async (c) => {
  const DB = c.env.DB;
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '50';
  const status = c.req.query('status');

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const countResult = await DB.prepare(`SELECT COUNT(*) as total FROM organizations ${whereClause}`).bind(...params).first();
  const total = countResult?.total || 0;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const results = await DB.prepare(`
    SELECT * FROM organizations
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, parseInt(pageSize), offset).all();

  const data = results.results?.map(org => ({
    id: org.id,
    name: org.name,
    contact_name: org.contact_name,
    contact_phone: org.contact_phone,
    contact_email: org.contact_email,
    address: org.address,
    notes: org.notes,
    status: org.status,
    created_at: org.created_at,
    updated_at: org.updated_at,
    _links: {
      self: `/api/v1/organizations/${org.id}`,
      students: `/api/v1/organizations/${org.id}/students`,
      teachers: `/api/v1/organizations/${org.id}/teachers`,
      classes: `/api/v1/organizations/${org.id}/classes`
    }
  })) || [];

  return c.json(success({
    data,
    pagination: {
      total,
      page: parseInt(page),
      page_size: parseInt(pageSize),
      pages: Math.ceil(total / parseInt(pageSize))
    }
  }));
});

// 获取单个机构详情
organizations.get('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');

  const org = await DB.prepare(`
    SELECT * FROM organizations WHERE id = ?
  `).bind(id).first();

  if (!org) {
    return c.json(error('NOT_FOUND', '机构不存在'), 404);
  }

  // 统计机构数据
  const stats = await getOrgStats(DB, id);

  return c.json(success({ ...org, stats }));
});

// 创建新机构
organizations.post('/', async (c) => {
  const DB = c.env.DB;
  const body = await c.req.json();
  const { name, contact_name, contact_phone, contact_email, address, notes } = body;

  if (!name) {
    return c.json(error('VALIDATION_ERROR', '机构名称不能为空'), 400);
  }

  const result = await DB.prepare(`
    INSERT INTO organizations (name, contact_name, contact_phone, contact_email, address, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(name, contact_name || null, contact_phone || null, contact_email || null, address || null, notes || null).run();

  return c.json(success({
    id: result.meta.last_row_id,
    name,
    contact_name,
    status: 'active'
  }), 201);
});

// 更新机构信息
organizations.patch('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const { name, contact_name, contact_phone, contact_email, address, notes, status } = body;

  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (contact_name !== undefined) { updates.push('contact_name = ?'); values.push(contact_name); }
  if (contact_phone !== undefined) { updates.push('contact_phone = ?'); values.push(contact_phone); }
  if (contact_email !== undefined) { updates.push('contact_email = ?'); values.push(contact_email); }
  if (address !== undefined) { updates.push('address = ?'); values.push(address); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }

  if (updates.length === 0) {
    return c.json(error('VALIDATION_ERROR', '没有需要更新的字段'), 400);
  }

  values.push(id);

  await DB.prepare(`
    UPDATE organizations SET ${updates.join(', ')}, updated_at = datetime('now')
    WHERE id = ?
  `).bind(...values).run();

  return c.json(success({ id }));
});

// 删除机构（软删除，改为 inactive）
organizations.delete('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');

  await DB.prepare(
    'UPDATE organizations SET status = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind('inactive', id).run();

  return c.json(success({ message: '机构已停用' }));
});

// 获取机构的学生列表
organizations.get('/:id/students', async (c) => {
  const DB = c.env.DB;
  const orgId = c.req.param('id');
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';

  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const results = await DB.prepare(`
    SELECT id, name, phone, email, age, grade, parent_name, status, total_hours, used_hours, created_at
    FROM students
    WHERE organization_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(orgId, parseInt(pageSize), offset).all();

  return c.json(success(results.results || []));
});

// 获取机构的排课列表
organizations.get('/:id/classes', async (c) => {
  const DB = c.env.DB;
  const orgId = c.req.param('id');
  const date = c.req.query('date');

  let whereClause = 'WHERE c.organization_id = ?';
  const params = [orgId];

  if (date) {
    whereClause += ' AND c.date = ?';
    params.push(date);
  }

  const results = await DB.prepare(`
    SELECT c.*, s.name as student_name, t.name as teacher_name
    FROM classes c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN teachers t ON c.teacher_id = t.id
    ${whereClause}
    ORDER BY c.date DESC, c.start_time DESC
  `).bind(...params).all();

  return c.json(success(results.results || []));
});

// 获取机构的教师列表
organizations.get('/:id/teachers', async (c) => {
  const DB = c.env.DB;
  const orgId = c.req.param('id');

  const results = await DB.prepare(`
    SELECT id, name, phone, email, subjects, status, created_at
    FROM teachers
    WHERE organization_id = ?
    ORDER BY name ASC
  `).bind(orgId).all();

  return c.json(success(results.results || []));
});

// 辅助函数：获取机构统计数据
async function getOrgStats(DB, orgId) {
  const [studentCount, teacherCount, classCount] = await Promise.all([
    DB.prepare('SELECT COUNT(*) as count FROM students WHERE organization_id = ?').bind(orgId).first(),
    DB.prepare('SELECT COUNT(*) as count FROM teachers WHERE organization_id = ?').bind(orgId).first(),
    DB.prepare('SELECT COUNT(*) as count FROM classes WHERE organization_id = ?').bind(orgId).first()
  ]);

  return {
    student_count: studentCount?.count || 0,
    teacher_count: teacherCount?.count || 0,
    class_count: classCount?.count || 0
  };
}

export default organizations;