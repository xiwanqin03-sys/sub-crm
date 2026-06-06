/**
 * Courses 路由 - 课程模板管理
 */
import { Hono } from 'hono';

const courses = new Hono();

// 获取课程列表
courses.get('/', async (c) => {
  const DB = c.env.DB;
  try {
    const results = await DB.prepare(`
      SELECT c.*, t.name as teacher_name
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      ORDER BY c.name ASC
    `).all();
    
    const data = results.results?.map(course => ({
      id: course.id,
      name: course.name,
      subject: course.subject,
      level: course.level,
      duration: course.duration,
      price: course.price,
      description: course.description,
      teacher_id: course.teacher_id,
      teacher_name: course.teacher_name,
      status: course.status,
      created_at: course.created_at,
      updated_at: course.updated_at
    })) || [];
    
    return c.json({
      data: {
        data,
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
      error: { code: 'DATABASE_ERROR', message: err.message },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
});

// 获取单个课程
courses.get('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');
  
  try {
    const course = await DB.prepare(`
      SELECT c.*, t.name as teacher_name
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `).bind(id).first();
    
    if (!course) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '课程不存在' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }
    
    return c.json({
      data: {
        id: course.id,
        name: course.name,
        subject: course.subject,
        level: course.level,
        duration: course.duration,
        price: course.price,
        description: course.description,
        teacher_id: course.teacher_id,
        teacher_name: course.teacher_name,
        status: course.status,
        created_at: course.created_at,
        updated_at: course.updated_at
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

// 创建课程
courses.post('/', async (c) => {
  const DB = c.env.DB;
  const body = await c.req.json();
  
  if (!body.name || body.name.trim() === '') {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: '课程名称不能为空' },
      meta: { timestamp: new Date().toISOString() }
    }, 400);
  }
  
  try {
    const result = await DB.prepare(`
      INSERT INTO courses (name, subject, level, duration, price, description, teacher_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name,
      body.subject || null,
      body.level || 'all',
      body.duration || 60,
      body.price || null,
      body.description || null,
      body.teacher_id || null,
      body.status || 'active'
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

// 更新课程
courses.patch('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  try {
    const existing = await DB.prepare('SELECT id FROM courses WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '课程不存在' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(body)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    
    if (fields.length > 0) {
      await DB.prepare(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run();
    }
    
    const course = await DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();
    return c.json({
      data: {
        id: course.id,
        name: course.name,
        status: course.status,
        updated_at: course.updated_at
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

// 删除课程
courses.delete('/:id', async (c) => {
  const DB = c.env.DB;
  const id = c.req.param('id');
  
  try {
    const existing = await DB.prepare('SELECT id FROM courses WHERE id = ?').bind(id).first();
    if (!existing) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '课程不存在' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }
    
    await DB.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();
    return c.body(null, 204);
  } catch (err) {
    return c.json({
      error: { code: 'DATABASE_ERROR', message: err.message },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
});

export default courses;
