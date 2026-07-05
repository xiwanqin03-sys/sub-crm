/**
 * Auth 路由 - 机构端登录
 */
import { Hono } from 'hono';
import { success, error } from '../utils/response.js';

const auth = new Hono();

// 简单的 hash 函数（不依赖 bcrypt，用 Web Crypto API 的 SHA-256）
// 在 Cloudflare Workers 环境中没有 bcrypt 模块，用 SHA-256 + salt 即可
async function hashPassword(password, salt = 'sunnybridge') {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成随机 token
function generateToken(orgId) {
  const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `org-${orgId}-${random}`;
}

// POST /login - 机构端登录
auth.post('/login', async (c) => {
  const DB = c.env.DB;
  const { login_code, password } = await c.req.json();

  if (!login_code || !password) {
    return c.json(error('VALIDATION_ERROR', '请输入机构代码和密码'), 400);
  }

  // 查找机构
  const org = await DB.prepare(
    'SELECT id, name, login_code, password_hash, status FROM organizations WHERE login_code = ?'
  ).bind(login_code).first();

  if (!org) {
    return c.json(error('NOT_FOUND', '机构代码不存在'), 404);
  }

  if (org.status === 'inactive') {
    return c.json(error('FORBIDDEN', '该机构已停用'), 403);
  }

  // 检查是否已设置密码
  if (!org.password_hash) {
    return c.json(error('NOT_CONFIGURED', '该机构尚未设置登录密码，请联系超级管理员'), 400);
  }

  // 验证密码
  const inputHash = await hashPassword(password);
  if (inputHash !== org.password_hash) {
    return c.json(error('UNAUTHORIZED', '密码错误'), 401);
  }

  // 返回 token
  const token = generateToken(org.id);

  return c.json(success({
    token,
    org_id: org.id,
    name: org.name,
    login_code: org.login_code
  }));
});

// POST /verify - 验证 token（前端刷新页面时用）
auth.post('/verify', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token || !token.startsWith('org-')) {
    return c.json(error('UNAUTHORIZED', '无效的机构凭证'), 401);
  }

  // token 格式: org-<orgId>-<random>
  const parts = token.split('-');
  if (parts.length < 3) {
    return c.json(error('UNAUTHORIZED', '无效的机构凭证'), 401);
  }

  const orgId = parts[1];
  const org = await c.env.DB.prepare(
    'SELECT id, name, login_code, status FROM organizations WHERE id = ?'
  ).bind(orgId).first();

  if (!org || org.status === 'inactive') {
    return c.json(error('UNAUTHORIZED', '机构不存在或已停用'), 401);
  }

  return c.json(success({
    org_id: org.id,
    name: org.name,
    login_code: org.login_code
  }));
});

// 导出 hashPassword 供 organizations 路由使用
export { hashPassword };
export default auth;
