/**
 * Settings 路由
 * P2: 系统设置
 */
import { Hono } from 'hono';
import { success, error } from '../utils/response.js';

const settings = new Hono();

// 获取所有设置
settings.get('/', async (c) => {
  const DB = c.env.DB;

  const results = await DB.prepare('SELECT * FROM settings').all();

  const data = {};
  results.results?.forEach(setting => {
    data[setting.key] = setting.value;
  });

  return c.json(success(data));
});

// 获取单个设置
settings.get('/:key', async (c) => {
  const DB = c.env.DB;
  const key = c.req.param('key');

  const setting = await DB.prepare('SELECT * FROM settings WHERE key = ?').bind(key).first();

  if (!setting) {
    return c.json(error('NOT_FOUND', '设置不存在'), 404);
  }

  return c.json(success({
    key: setting.key,
    value: setting.value,
    updated_at: setting.updated_at
  }));
});

// 批量更新设置
settings.patch('/', async (c) => {
  const DB = c.env.DB;

  // 获取请求体
  const body = await c.req.json();

  if (!body || typeof body !== 'object') {
    return c.json(error('VALIDATION_ERROR', '请求体必须是 JSON 对象'), 400);
  }

  const updates = [];
  for (const [key, value] of Object.entries(body)) {
    updates.push(
      DB.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
      `).bind(key, String(value), String(value))
    );
  }

  // 执行所有更新
  await DB.batch(updates);

  // 返回更新后的设置
  const results = await DB.prepare('SELECT * FROM settings').all();

  const data = {};
  results.results?.forEach(setting => {
    data[setting.key] = setting.value;
  });

  return c.json(success(data));
});

export default settings;