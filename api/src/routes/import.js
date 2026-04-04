/**
 * Import 路由
 * 数据导入功能
 */
import { Hono } from 'hono';
import { success, error } from '../utils/response.js';

const importRoute = new Hono();

// 导入数据
importRoute.post('/', async (c) => {
  const DB = c.env.DB;
  
  try {
    const body = await c.req.json();
    const { data, mode = 'merge' } = body;
    
    if (!data) {
      return c.json(error('INVALID_DATA', '无效的导入数据'), 400);
    }
    
    const results = {
      students: { imported: 0, skipped: 0 },
      packages: { imported: 0, skipped: 0 },
      classes: { imported: 0, skipped: 0 },
      payments: { imported: 0, skipped: 0 },
      teachers: { imported: 0, skipped: 0 },
      courses: { imported: 0, skipped: 0 },
      settings: { imported: 0, skipped: 0 }
    };
    
    // 如果模式是 'replace'，先清空数据
    if (mode === 'replace') {
      await DB.prepare('DELETE FROM classes').run();
      await DB.prepare('DELETE FROM payments').run();
      await DB.prepare('DELETE FROM packages').run();
      await DB.prepare('DELETE FROM students').run();
      await DB.prepare('DELETE FROM teachers').run();
      await DB.prepare('DELETE FROM courses').run();
      await DB.prepare('DELETE FROM settings').run();
    }
    
    // 导入学生
    if (data.students && Array.isArray(data.students)) {
      for (const student of data.students) {
        try {
          // 检查是否已存在
          if (mode === 'merge') {
            const existing = await DB.prepare('SELECT id FROM students WHERE id = ?').bind(student.id).first();
            if (existing) {
              results.students.skipped++;
              continue;
            }
          }
          
          await DB.prepare(`
            INSERT INTO students (id, name, phone, email, age, grade, parent_name, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            student.id,
            student.name,
            student.phone || null,
            student.email || null,
            student.age || null,
            student.grade || null,
            student.parent_name || null,
            student.notes || null,
            student.status || 'active',
            student.created_at || new Date().toISOString(),
            student.updated_at || new Date().toISOString()
          ).run();
          results.students.imported++;
        } catch (err) {
          console.error('Import student error:', err);
          results.students.skipped++;
        }
      }
    }
    
    // 导入教师
    if (data.teachers && Array.isArray(data.teachers)) {
      for (const teacher of data.teachers) {
        try {
          if (mode === 'merge') {
            const existing = await DB.prepare('SELECT id FROM teachers WHERE id = ?').bind(teacher.id).first();
            if (existing) {
              results.teachers.skipped++;
              continue;
            }
          }
          
          await DB.prepare(`
            INSERT INTO teachers (id, name, phone, email, subjects, hourly_rate, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            teacher.id,
            teacher.name,
            teacher.phone || null,
            teacher.email || null,
            teacher.subjects || null,
            teacher.hourly_rate || null,
            teacher.status || 'active',
            teacher.notes || null,
            teacher.created_at || new Date().toISOString(),
            teacher.updated_at || new Date().toISOString()
          ).run();
          results.teachers.imported++;
        } catch (err) {
          console.error('Import teacher error:', err);
          results.teachers.skipped++;
        }
      }
    }
    
    // 导入课程
    if (data.courses && Array.isArray(data.courses)) {
      for (const course of data.courses) {
        try {
          if (mode === 'merge') {
            const existing = await DB.prepare('SELECT id FROM courses WHERE id = ?').bind(course.id).first();
            if (existing) {
              results.courses.skipped++;
              continue;
            }
          }
          
          await DB.prepare(`
            INSERT INTO courses (id, name, subject, level, duration, price, description, teacher_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            course.id,
            course.name,
            course.subject || null,
            course.level || 'all',
            course.duration || 60,
            course.price || null,
            course.description || null,
            course.teacher_id || null,
            course.status || 'active',
            course.created_at || new Date().toISOString(),
            course.updated_at || new Date().toISOString()
          ).run();
          results.courses.imported++;
        } catch (err) {
          console.error('Import course error:', err);
          results.courses.skipped++;
        }
      }
    }
    
    // 导入课时包
    if (data.packages && Array.isArray(data.packages)) {
      for (const pkg of data.packages) {
        try {
          if (mode === 'merge') {
            const existing = await DB.prepare('SELECT id FROM packages WHERE id = ?').bind(pkg.id).first();
            if (existing) {
              results.packages.skipped++;
              continue;
            }
          }
          
          await DB.prepare(`
            INSERT INTO packages (id, student_id, name, total, used, remaining, price, purchase_date, expire_date, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            pkg.id,
            pkg.student_id,
            pkg.name || `${pkg.total}节套餐`,
            pkg.total,
            pkg.used || 0,
            pkg.remaining || pkg.total,
            pkg.price || null,
            pkg.purchase_date || new Date().toISOString().split('T')[0],
            pkg.expire_date || null,
            pkg.notes || null,
            pkg.status || 'active',
            pkg.created_at || new Date().toISOString(),
            pkg.updated_at || new Date().toISOString()
          ).run();
          results.packages.imported++;
        } catch (err) {
          console.error('Import package error:', err);
          results.packages.skipped++;
        }
      }
    }
    
    // 导入上课记录
    if (data.classes && Array.isArray(data.classes)) {
      for (const cls of data.classes) {
        try {
          if (mode === 'merge') {
            const existing = await DB.prepare('SELECT id FROM classes WHERE id = ?').bind(cls.id).first();
            if (existing) {
              results.classes.skipped++;
              continue;
            }
          }
          
          await DB.prepare(`
            INSERT INTO classes (id, student_id, package_id, teacher, teacher_id, subject, hours, date, start_time, end_time, content, homework, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            cls.id,
            cls.student_id,
            cls.package_id || null,
            cls.teacher || null,
            cls.teacher_id || null,
            cls.subject || null,
            cls.hours || 1,
            cls.date,
            cls.start_time || null,
            cls.end_time || null,
            cls.content || null,
            cls.homework || null,
            cls.notes || null,
            cls.status || 'completed',
            cls.created_at || new Date().toISOString(),
            cls.updated_at || new Date().toISOString()
          ).run();
          results.classes.imported++;
        } catch (err) {
          console.error('Import class error:', err);
          results.classes.skipped++;
        }
      }
    }
    
    // 导入付款记录
    if (data.payments && Array.isArray(data.payments)) {
      for (const payment of data.payments) {
        try {
          if (mode === 'merge') {
            const existing = await DB.prepare('SELECT id FROM payments WHERE id = ?').bind(payment.id).first();
            if (existing) {
              results.payments.skipped++;
              continue;
            }
          }
          
          await DB.prepare(`
            INSERT INTO payments (id, student_id, amount, payment_method, package_id, description, date, receipt_number, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            payment.id,
            payment.student_id,
            payment.amount,
            payment.payment_method || 'other',
            payment.package_id || null,
            payment.description || null,
            payment.date,
            payment.receipt_number || null,
            payment.notes || null,
            payment.created_at || new Date().toISOString()
          ).run();
          results.payments.imported++;
        } catch (err) {
          console.error('Import payment error:', err);
          results.payments.skipped++;
        }
      }
    }
    
    // 导入设置
    if (data.settings && Array.isArray(data.settings)) {
      for (const setting of data.settings) {
        try {
          await DB.prepare(`
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
          `).bind(
            setting.key,
            setting.value,
            setting.updated_at || new Date().toISOString()
          ).run();
          results.settings.imported++;
        } catch (err) {
          console.error('Import setting error:', err);
          results.settings.skipped++;
        }
      }
    }
    
    return c.json(success({
      message: '数据导入完成',
      results,
      importedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.error('Import error:', err);
    return c.json(error('IMPORT_ERROR', '导入失败: ' + err.message), 500);
  }
});

export default importRoute;
