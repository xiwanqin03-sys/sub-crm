/**
 * 教师分享链接路由 - 方案二方式A
 * 
 * 访问方式：
 * - GET /share/:token - 获取教师基本信息（无需认证）
 * - POST /share/:token/verify - 验证密码
 */

import { Hono } from 'hono';

const teacherShare = new Hono();

// 生成随机令牌
function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'tk_';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 获取教师基本信息（通过分享令牌，无需认证）
teacherShare.get('/:token', async (c) => {
  const DB = c.env.DB;
  const token = c.req.param('token');

  try {
    const teacher = await DB.prepare(
      'SELECT id, name, phone, email, subjects, status FROM teachers WHERE share_token = ?'
    ).bind(token).first();

    if (!teacher) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '分享链接无效或已过期' },
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
        status: teacher.status,
        hasPassword: true // 告诉前端需要密码验证
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

// 验证密码
teacherShare.post('/:token/verify', async (c) => {
  const DB = c.env.DB;
  const token = c.req.param('token');
  const body = await c.req.json();

  if (!body.password) {
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: '请输入密码' },
      meta: { timestamp: new Date().toISOString() }
    }, 400);
  }

  try {
    const teacher = await DB.prepare(
      'SELECT id, name, password FROM teachers WHERE share_token = ?'
    ).bind(token).first();

    if (!teacher) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '分享链接无效或已过期' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }

    // 验证密码
    if (teacher.password !== body.password) {
      return c.json({
        error: { code: 'UNAUTHORIZED', message: '密码错误' },
        meta: { timestamp: new Date().toISOString() }
      }, 401);
    }

    return c.json({
      data: {
        verified: true,
        teacherId: teacher.id,
        teacherName: teacher.name
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

// 生成或刷新分享令牌（需要管理员权限）
teacherShare.post('/:teacherId/generate-token', async (c) => {
  const DB = c.env.DB;
  const teacherId = c.req.param('teacherId');

  try {
    const existing = await DB.prepare(
      'SELECT id FROM teachers WHERE id = ?'
    ).bind(teacherId).first();

    if (!existing) {
      return c.json({
        error: { code: 'NOT_FOUND', message: '教师不存在' },
        meta: { timestamp: new Date().toISOString() }
      }, 404);
    }

    const newToken = generateToken();
    
    await DB.prepare(
      'UPDATE teachers SET share_token = ? WHERE id = ?'
    ).bind(newToken, teacherId).run();

    return c.json({
      data: {
        token: newToken,
        shareUrl: `/teacher/share/${newToken}`
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

export default teacherShare;
