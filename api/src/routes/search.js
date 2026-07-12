/**
 * Search 路由
 * P2: 全局搜索
 */
import { Hono } from 'hono';
import { success } from '../utils/response.js';

const search = new Hono();

// 全局搜索
search.get('/', async (c) => {
  const DB = c.env.DB;
  const query = c.req.query('q') || '';
  const type = c.req.query('type') || 'all'; // student/class/payment/all

  if (!query || query.length < 1) {
    return c.json(success({
      students: [],
      classes: [],
      payments: []
    }));
  }

  const searchPattern = `%${query}%`;
  const results = {
    students: [],
    classes: [],
    payments: []
  };

  // 搜索学生
  if (type === 'all' || type === 'student') {
    const students = await DB.prepare(`
      SELECT id, name, english_name, phone, status FROM students
      WHERE name LIKE ? OR english_name LIKE ? OR phone LIKE ? OR parent_name LIKE ?
      ORDER BY name ASC
      LIMIT 20
    `).bind(searchPattern, searchPattern, searchPattern, searchPattern).all();

    results.students = students.results?.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      status: s.status
    })) || [];
  }

  // 搜索上课记录
  if (type === 'all' || type === 'class') {
    const classes = await DB.prepare(`
      SELECT c.id, c.date, c.subject, c.teacher, c.status, s.name as student_name
      FROM classes c
      JOIN students s ON c.student_id = s.id
      WHERE c.content LIKE ? OR c.teacher LIKE ? OR c.subject LIKE ? OR s.name LIKE ?
      ORDER BY c.date DESC
      LIMIT 20
    `).bind(searchPattern, searchPattern, searchPattern, searchPattern).all();

    results.classes = classes.results?.map(cls => ({
      id: cls.id,
      student_name: cls.student_name,
      date: cls.date,
      subject: cls.subject,
      teacher: cls.teacher,
      status: cls.status
    })) || [];
  }

  // 搜索付款记录
  if (type === 'all' || type === 'payment') {
    const payments = await DB.prepare(`
      SELECT p.id, p.amount, p.date, p.description, s.name as student_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE p.description LIKE ? OR p.receipt_number LIKE ? OR s.name LIKE ?
      ORDER BY p.date DESC
      LIMIT 20
    `).bind(searchPattern, searchPattern, searchPattern).all();

    results.payments = payments.results?.map(p => ({
      id: p.id,
      student_name: p.student_name,
      amount: p.amount,
      date: p.date,
      description: p.description
    })) || [];
  }

  return c.json(success(results));
});

export default search;