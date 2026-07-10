/**
 * Export 路由
 * 数据导出功能
 */
import { Hono } from 'hono';
import { success, error } from '../utils/response.js';

const exportRoute = new Hono();

// 导出所有数据
exportRoute.get('/', async (c) => {
  const DB = c.env.DB;
  const format = c.req.query('format') || 'json';
  
  try {
    // 获取所有数据
    const students = await DB.prepare('SELECT * FROM students ORDER BY created_at DESC').all();
    const packages = await DB.prepare('SELECT * FROM packages ORDER BY created_at DESC').all();
    const classes = await DB.prepare('SELECT * FROM classes ORDER BY date DESC').all();
    const payments = await DB.prepare('SELECT * FROM payments ORDER BY date DESC').all();
    const teachers = await DB.prepare('SELECT * FROM teachers ORDER BY created_at DESC').all();
    const courses = await DB.prepare('SELECT * FROM courses ORDER BY created_at DESC').all();
    const settings = await DB.prepare('SELECT * FROM settings').all();
    const hourChanges = await DB.prepare('SELECT * FROM hour_changes ORDER BY created_at DESC').all();
    const teacherPayments = await DB.prepare('SELECT * FROM teacher_payments ORDER BY created_at DESC').all();
    const leads = await DB.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    const organizations = await DB.prepare('SELECT * FROM organizations ORDER BY created_at DESC').all();
    const orgPackages = await DB.prepare('SELECT * FROM org_packages ORDER BY created_at DESC').all();
    const orgHourAllocations = await DB.prepare('SELECT * FROM org_hour_allocations ORDER BY created_at DESC').all();
    const orgSettlements = await DB.prepare('SELECT * FROM org_settlements ORDER BY generated_at DESC').all();
    const orgSettlementItems = await DB.prepare('SELECT * FROM org_settlement_items ORDER BY class_date DESC').all();
    
    const data = {
      students: students.results || [],
      packages: packages.results || [],
      classes: classes.results || [],
      payments: payments.results || [],
      teachers: teachers.results || [],
      courses: courses.results || [],
      settings: settings.results || [],
      hour_changes: hourChanges.results || [],
      teacher_payments: teacherPayments.results || [],
      leads: leads.results || [],
      organizations: organizations.results || [],
      org_packages: orgPackages.results || [],
      org_hour_allocations: orgHourAllocations.results || [],
      org_settlements: orgSettlements.results || [],
      org_settlement_items: orgSettlementItems.results || [],
      exportedAt: new Date().toISOString(),
      version: '1.1.0'
    };
    
    if (format === 'json') {
      return c.json({
        success: true,
        data,
        meta: {
          exportedAt: data.exportedAt,
          counts: {
            students: data.students.length,
            packages: data.packages.length,
            classes: data.classes.length,
            payments: data.payments.length,
            teachers: data.teachers.length,
            courses: data.courses.length,
            hour_changes: data.hour_changes.length,
            teacher_payments: data.teacher_payments.length,
            leads: data.leads.length,
            organizations: data.organizations.length,
            org_packages: data.org_packages.length,
            org_hour_allocations: data.org_hour_allocations.length,
            org_settlements: data.org_settlements.length,
            org_settlement_items: data.org_settlement_items.length
          }
        }
      });
    }
    
    return c.json(error('INVALID_FORMAT', '不支持的导出格式'), 400);
  } catch (err) {
    console.error('Export error:', err);
    return c.json(error('EXPORT_ERROR', '导出失败: ' + err.message), 500);
  }
});

export default exportRoute;
