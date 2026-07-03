/**
 * Teachers 路由 - 简化版
 */
import { Hono } from 'hono';

const teachers = new Hono();

// 获取教师列表
teachers.get('/', async (c) => {
  const DB = c.env.DB;

  try {
    let whereClause = 'WHERE 1=1';
    const params = [];

    // 数据隔离：根据用户角色过滤组织数据
    const userRole = c.req.header('X-User-Role') || 'org_admin';
    const userOrgId = c.req.header('X-Organization-Id');

    if (userRole !== 'super_admin' && userOrgId) {
      whereClause += ' AND organization_id = ?';
      params.push(parseInt(userOrgId));
    }

    const results = await DB.prepare(`SELECT * FROM teachers ${whereClause} ORDER BY name ASC`).bind(...params).all();
    
    const data = results.results?.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      subjects: teacher.subjects ? JSON.parse(teacher.subjects) : [],
      hourly_rate: teacher.hourly_rate,
      status: teacher.status,
      notes: teacher.notes,
      created_at: teacher.created_at,
      updated_at: teacher.updated_at
    })) || [];
    
    return c.json({
      data: {
        items: data,
        pagination: {
          page: 1,
          page_size: 20,
          total: data.length,
          pages: 1,
          has_next: false,
          has_prev: false
        }
      },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (err) {
    return c.json({
      error: {
        code: 'DATABASE_ERROR',
        message: err.message
      },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
});

// 获取单个教师
teachers.get('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');
  
  try {
    const teacher = await DB.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first();
    
    if (!teacher) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '教师不存在' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }
    
    return c.json({
      data: {
        id: teacher.id,
        name: teacher.name,
        phone: teacher.phone,
        email: teacher.email,
        subjects: teacher.subjects ? JSON.parse(teacher.subjects) : [],
        hourly_rate: teacher.hourly_rate,
        status: teacher.status,
        notes: teacher.notes,
        created_at: teacher.created_at,
        updated_at: teacher.updated_at
      },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (err) {
    return c.json({
      error: { code: 'DATABASE_ERROR', message: err.message },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
});

// 创建教师
teachers.post('/', async (c) => {
  const DB = c.env.DB;
  const body = await c.req.json();
  
  if (!body.name || body.name.trim() === '') {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: '教师姓名不能为空' },
      meta: { timestamp: new Date().toISOString() }
    }, 400);
  }
  
  try {
    const subjectsJson = body.subjects ? JSON.stringify(body.subjects) : null;

    // 数据隔离：获取所属机构
    const userRole = c.req.header('X-User-Role') || 'org_admin';
    const userOrgId = c.req.header('X-Organization-Id');
    const organizationId = (userRole !== 'super_admin' && userOrgId) ? parseInt(userOrgId) : 1;

    const result = await DB.prepare(`
      INSERT INTO teachers (name, phone, email, subjects, hourly_rate, status, notes, organization_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name,
      body.phone || null,
      body.email || null,
      subjectsJson,
      body.hourly_rate || null,
      body.status || 'active',
      body.notes || null,
      organizationId
    ).run();
    
    return c.json({
      data: {
        id: result.meta.last_row_id,
        name: body.name,
        status: body.status || 'active',
        created_at: new Date().toISOString()
      },
      meta: { timestamp: new Date().toISOString() }
    }, 201);
  } catch (err) {
    return c.json({
      error: { code: 'DATABASE_ERROR', message: err.message },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
});

// 更新教师
teachers.patch('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  try {
    const existing = await DB.prepare('SELECT id FROM teachers WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '教师不存在' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(body)) {
      if (key === 'subjects' && value) {
        fields.push('subjects = ?');
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length > 0) {
      await DB.prepare(`UPDATE teachers SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    }
    
    const teacher = await DB.prepare('SELECT * FROM teachers WHERE id = ?').bind(id).first();
    
    return c.json({
      data: {
        id: teacher.id,
        name: teacher.name,
        status: teacher.status,
        updated_at: teacher.updated_at
      },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (err) {
    return c.json({
      error: { code: 'DATABASE_ERROR', message: err.message },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
});

// 删除教师
teachers.delete('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');
  
  try {
    const existing = await DB.prepare('SELECT id FROM teachers WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '教师不存在' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }
    
    await DB.prepare('DELETE FROM teachers WHERE id = ?').bind(id).run();
    return c.body(null, 204);
  } catch (err) {
    return c.json({
      error: { code: 'DATABASE_ERROR', message: err.message },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
});

export default teachers;
