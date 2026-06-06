/**
 * Admin 路由
 * 管理功能：清空数据、重置数据库等
 */
import { Hono } from 'hono';
import { success, error } from '../utils/response.js';

const admin = new Hono();

// 清空所有数据（危险操作）
admin.post('/clear-all', async (c) => {
  const DB = c.env.DB;
  
  try {
    // 按外键依赖顺序删除
    await DB.prepare('DELETE FROM classes').run();
    await DB.prepare('DELETE FROM payments').run();
    await DB.prepare('DELETE FROM packages').run();
    await DB.prepare('DELETE FROM hour_changes').run();
    await DB.prepare('DELETE FROM students').run();
    await DB.prepare('DELETE FROM teachers').run();
    await DB.prepare('DELETE FROM courses').run();
    
    // 重置自增 ID（SQLite）
    await DB.prepare("DELETE FROM sqlite_sequence WHERE name IN ('students', 'packages', 'classes', 'payments', 'teachers', 'courses', 'hour_changes')").run();
    
    return c.json(success({ 
      message: '所有数据已清空',
      cleared: ['students', 'packages', 'classes', 'payments', 'teachers', 'courses', 'hour_changes']
    }));
  } catch (err) {
    console.error('Clear all data error:', err);
    return c.json(error('CLEAR_ERROR', '清空数据失败: ' + err.message), 500);
  }
});

// 获取数据库统计
admin.get('/stats', async (c) => {
  const DB = c.env.DB;
  
  try {
    const students = await DB.prepare('SELECT COUNT(*) as count FROM students').first();
    const packages = await DB.prepare('SELECT COUNT(*) as count FROM packages').first();
    const classes = await DB.prepare('SELECT COUNT(*) as count FROM classes').first();
    const payments = await DB.prepare('SELECT COUNT(*) as count FROM payments').first();
    const teachers = await DB.prepare('SELECT COUNT(*) as count FROM teachers').first();
    const courses = await DB.prepare('SELECT COUNT(*) as count FROM courses').first();
    
    return c.json(success({
      students: students.count,
      packages: packages.count,
      classes: classes.count,
      payments: payments.count,
      teachers: teachers.count,
      courses: courses.count
    }));
  } catch (err) {
    console.error('Get stats error:', err);
    return c.json(error('STATS_ERROR', '获取统计失败: ' + err.message), 500);
  }
});

export default admin;
