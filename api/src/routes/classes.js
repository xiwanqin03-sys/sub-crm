/**
 * Classes 路由
 * P1: 上课记录 CRUD
 */
import { Hono } from 'hono';
import { classSchema, classUpdateSchema, validate, validateParams, idParamSchema, paginationSchema, validateQuery } from '../utils/validation.js';
import { success, error, calculatePagination } from '../utils/response.js';

const classes = new Hono();

// ── 课时系数辅助 ──
// 优先使用 organization.short_class_coefficient，否则用 settings 中的全局值
async function resolveCoefficient(DB, orgId) {
  if (orgId) {
    const org = await DB.prepare('SELECT short_class_coefficient FROM organizations WHERE id = ?').bind(orgId).first();
    if (org && org.short_class_coefficient !== null) {
      return parseFloat(org.short_class_coefficient);
    }
  }
  const setting = await DB.prepare("SELECT value FROM settings WHERE key = 'short_class_coefficient'").first();
  return setting ? parseFloat(setting.value) : 0.66;
}

// 根据 data.duration 或 data.hours 计算实际课时数
async function resolveClassHours(DB, data, orgId) {
  // 如果有 duration（分钟），按系数计算
  if (data.duration) {
    const dur = parseInt(data.duration);
    if (dur === 50) return 1.0;
    if (dur === 25) return await resolveCoefficient(DB, orgId);
    return dur / 50; // 其他时长以50分钟为1课时
  }
  // 兼容：前端直接传 hours 的情况
  return data.hours || 1;
}

// ── 老师时间冲突检查 ──
// 同一老师、同一日期、时间区间重叠（排除 cancelled 状态）
// 返回冲突记录数组（空=无冲突）
async function checkTeacherConflict(DB, { teacherId, date, startTime, endTime, excludeId = null }) {
  if (!teacherId || !date || !startTime || !endTime) return [];
  const conflicts = await DB.prepare(`
    SELECT id, student_id, date, start_time, end_time, status
    FROM classes
    WHERE teacher_id = ?
      AND date = ?
      AND status != 'cancelled'
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
      AND start_time < ?
      AND end_time > ?
      ${excludeId ? 'AND id != ?' : ''}
  `).bind(teacherId, date, endTime, startTime, ...(excludeId ? [excludeId] : [])).all();
  return conflicts.results || [];
}

// 获取所有上课记录（支持过滤）
classes.get('/', async (c) => {
  const DB = c.env.DB;
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';
  const studentId = c.req.query('student_id');
  const teacherId = c.req.query('teacher_id');
  const status = c.req.query('status');

  // 构建查询条件
  let whereClause = 'WHERE 1=1';
  const params = [];

  // 数据隔离：根据用户角色过滤组织数据
  const userRole = c.req.header('X-User-Role') || 'org_admin';
  const userOrgId = c.req.header('X-Organization-Id');

  if (userRole !== 'super_admin' && userOrgId) {
    whereClause += ' AND c.organization_id = ?';
    params.push(parseInt(userOrgId));
  } else if (c.req.query('org_id')) {
    whereClause += ' AND c.organization_id = ?';
    params.push(parseInt(c.req.query('org_id')));
  }

  if (studentId) {
    whereClause += ' AND c.student_id = ?';
    params.push(studentId);
  }

  if (teacherId) {
    whereClause += ' AND c.teacher_id = ?';
    params.push(teacherId);
  }

  if (status) {
    whereClause += ' AND c.status = ?';
    params.push(status);
  }

  // 统计总数
  const countResult = await DB.prepare(`SELECT COUNT(*) as total FROM classes c ${whereClause}`).bind(...params).first();
  const total = countResult?.total || 0;
  const pagination = calculatePagination(page, pageSize, total);

  // 查询数据
  const results = await DB.prepare(`
    SELECT c.*, s.name as student_name, p.name as package_name, t.name as teacher_name
    FROM classes c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN packages p ON c.package_id = p.id
    LEFT JOIN teachers t ON c.teacher_id = t.id
    ${whereClause}
    ORDER BY c.date DESC, c.start_time DESC
    LIMIT ? OFFSET ?
  `).bind(...params, pagination.page_size, pagination.offset).all();

const data = results.results?.map(cls => ({
  id: cls.id,
  student_id: cls.student_id,
  student_name: cls.student_name,
  package_id: cls.package_id,
  package_name: cls.package_name,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  teacher_name: cls.teacher_name,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  status: cls.status,
  class_link: cls.class_link,
  is_trial: cls.is_trial || 0,
  organization_id: cls.organization_id,
  created_at: cls.created_at,
  updated_at: cls.updated_at
})) || [];

  return c.json(success({ data, pagination }));
});

// 获取学生的上课记录
classes.get('/student/:student_id', async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');
  const page = c.req.query('page') || '1';
  const pageSize = c.req.query('page_size') || '20';

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id, name FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 查询总数
  const countResult = await DB.prepare('SELECT COUNT(*) as total FROM classes WHERE student_id = ?').bind(studentId).first();
  const total = countResult?.total || 0;
  const pagination = calculatePagination(page, pageSize, total);

  const results = await DB.prepare(`
    SELECT c.*, p.name as package_name
    FROM classes c
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE c.student_id = ?
    ORDER BY c.date DESC, c.start_time DESC
    LIMIT ? OFFSET ?
  `).bind(studentId, pagination.page_size, pagination.offset).all();

const data = results.results?.map(cls => ({
  id: cls.id,
  student_id: cls.student_id,
  package_id: cls.package_id,
  package_name: cls.package_name,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  class_link: cls.class_link,
  status: cls.status,
  organization_id: cls.organization_id,
  created_at: cls.created_at,
  updated_at: cls.updated_at
})) || [];

  return c.json(success({ data, pagination }));
});

// 获取单个上课记录
classes.get('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  const cls = await DB.prepare(`
    SELECT c.*, s.name as student_name, p.name as package_name, t.name as teacher_name
    FROM classes c
    JOIN students s ON c.student_id = s.id
    LEFT JOIN packages p ON c.package_id = p.id
    LEFT JOIN teachers t ON c.teacher_id = t.id
    WHERE c.id = ?
  `).bind(id).first();

  if (!cls) {
    return c.json(error('NOT_FOUND', '上课记录不存在'), 404);
  }

return c.json(success({
  id: cls.id,
  student_id: cls.student_id,
  student_name: cls.student_name,
  package_id: cls.package_id,
  package_name: cls.package_name,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  teacher_name: cls.teacher_name,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  class_link: cls.class_link,
  is_trial: cls.is_trial || 0,
  status: cls.status,
  organization_id: cls.organization_id,
  created_at: cls.created_at,
  updated_at: cls.updated_at
}));
});

// 创建上课记录（指定学生）
classes.post('/student/:student_id', validate(classSchema), async (c) => {
  const DB = c.env.DB;
  const studentId = c.req.param('student_id');
  const data = c.req.validated;

  // 检查学生是否存在
  const student = await DB.prepare('SELECT id, name FROM students WHERE id = ?').bind(studentId).first();
  if (!student) {
    return c.json(error('NOT_FOUND', '学生不存在'), 404);
  }

  // 如果指定了课时包，检查是否属于该学生
  if (data.package_id) {
    const pkg = await DB.prepare('SELECT id, student_id FROM packages WHERE id = ?').bind(data.package_id).first();
    if (!pkg || pkg.student_id !== parseInt(studentId)) {
      return c.json(error('INVALID_PACKAGE', '课时包不存在或不属于该学生'), 400);
    }
  }

  // ── 老师时间冲突检查 ──
  if (data.teacher_id && data.date && data.start_time && data.end_time) {
    const conflicts = await checkTeacherConflict(DB, {
      teacherId: data.teacher_id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time
    });
    if (conflicts.length > 0) {
      // 查冲突记录的学生名做提示
      const conflictStudentIds = conflicts.map(c => c.student_id);
      const studentNames = await DB.prepare(
        `SELECT id, name FROM students WHERE id IN (${conflictStudentIds.map(() => '?').join(',')})`
      ).bind(...conflictStudentIds).all();
      const names = (studentNames.results || []).map(s => s.name).join('、');
      return c.json(error('TEACHER_CONFLICT',
        `教师时间冲突！该教师 ${data.date} ${data.start_time}-${data.end_time} 已有课程（${names}）`
      ), 409);
    }
  }

  // 数据隔离：获取所属机构
  // 优先使用前端传入的 organization_id，否则从 header 取
  let organizationId;
  if (data.organization_id !== undefined && data.organization_id !== null) {
    organizationId = parseInt(data.organization_id);
  } else {
    const userRole = c.req.header('X-User-Role') || 'org_admin';
    const userOrgId = c.req.header('X-Organization-Id');
    organizationId = (userRole !== 'super_admin' && userOrgId) ? parseInt(userOrgId) : 1;
  }

  const result = await DB.prepare(`
    INSERT INTO classes (student_id, package_id, teacher, teacher_id, subject, hours, date, start_time, end_time, content, homework, notes, status, organization_id, is_trial)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    studentId,
    data.package_id || null,
    data.teacher || null,
    data.teacher_id || null,
    data.subject || null,
    await resolveClassHours(DB, data, organizationId),
    data.date || new Date().toISOString().split('T')[0],
    data.start_time || null,
    data.end_time || null,
    data.content || null,
    data.homework || null,
    data.notes || null,
    data.status || 'completed',
    organizationId,
    data.is_trial || 0
  ).run();

  const classId = result.meta.last_row_id;
  const classHours = await resolveClassHours(DB, data, organizationId);
  const classStatus = data.status || 'completed';

  // ── 同步机构课时包 ──
  if (organizationId && classStatus === 'completed') {
    // 找该机构最新 pending/partial_paid 包，增加 used_hours
    const targetPkg = await DB.prepare(
      `SELECT id FROM org_packages
       WHERE org_id = ? AND status IN ('pending', 'partial_paid')
       ORDER BY created_at DESC LIMIT 1`
    ).bind(organizationId).first();

    if (targetPkg) {
      await DB.prepare(
        `UPDATE org_packages SET used_hours = used_hours + ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(classHours, targetPkg.id).run();

      // 记录分配明细到 org_hour_allocations（负值=课程消耗）
      await DB.prepare(
        `INSERT INTO org_hour_allocations (org_id, package_id, student_id, hours, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(organizationId, targetPkg.id, studentId, -classHours, `课程消耗 -${classHours}节 (class ${classId})`, 'system').run();
    }
  }

  // 如果是已完成状态，记录课时消耗
  if (classStatus === 'completed') {
    const student = await DB.prepare('SELECT total_hours, used_hours FROM students WHERE id = ?').bind(studentId).first();
    const newUsed = (student.used_hours || 0) + classHours;
    const newRemaining = (student.total_hours || 0) - newUsed;

    await DB.prepare('UPDATE students SET used_hours = ? WHERE id = ?').bind(newUsed, studentId).run();

    // 记录课时变动
    await DB.prepare(`
      INSERT INTO hour_changes (student_id, type, amount, related_id, description)
      VALUES (?, 'class', ?, ?, ?)
    `).bind(studentId, -classHours, classId, `上课消耗 - ${classHours}节`).run();
  }

  return c.json(success({
    id: classId,
    student_id: parseInt(studentId),
    package_id: data.package_id || null,
    teacher: data.teacher || null,
    teacher_id: data.teacher_id || null,
    subject: data.subject || null,
    hours: classHours,
    date: data.date || new Date().toISOString().split('T')[0],
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    content: data.content || null,
    homework: data.homework || null,
    notes: data.notes || null,
    status: classStatus,
    is_trial: data.is_trial || 0,
    created_at: new Date().toISOString()
  }), 201);
});

// 更新上课记录
classes.patch('/:id', validateParams(idParamSchema), validate(classUpdateSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;
  const data = c.req.validated;

  // 检查上课记录是否存在
  const existing = await DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json(error('NOT_FOUND', '上课记录不存在'), 404);
  }

  // ── 老师时间冲突检查 ──
  // 用更新后的值（缺省回退到现有值）做检查
  const checkTeacherId = data.teacher_id ?? existing.teacher_id;
  const checkDate = data.date ?? existing.date;
  const checkStart = data.start_time ?? existing.start_time;
  const checkEnd = data.end_time ?? existing.end_time;
  if (checkTeacherId && checkDate && checkStart && checkEnd) {
    const conflicts = await checkTeacherConflict(DB, {
      teacherId: checkTeacherId,
      date: checkDate,
      startTime: checkStart,
      endTime: checkEnd,
      excludeId: id
    });
    if (conflicts.length > 0) {
      const conflictStudentIds = conflicts.map(c => c.student_id);
      const studentNames = await DB.prepare(
        `SELECT id, name FROM students WHERE id IN (${conflictStudentIds.map(() => '?').join(',')})`
      ).bind(...conflictStudentIds).all();
      const names = (studentNames.results || []).map(s => s.name).join('、');
      return c.json(error('TEACHER_CONFLICT',
        `教师时间冲突！该教师 ${checkDate} ${checkStart}-${checkEnd} 已有课程（${names}）`
      ), 409);
    }
  }

  // 构建更新语句
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await DB.prepare(`UPDATE classes SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  // ── 同步机构课时包 ──
  // 当 status 在 completed ↔ 其他 之间切换时，调整 org_packages.used_hours
  const oldStatus = existing.status;
  const newStatus = data.status ?? oldStatus;
  const clsHours = data.hours ?? existing.hours;
  const clsOrgId = existing.organization_id;

  if (clsOrgId && oldStatus !== newStatus) {
    let delta = 0;
    let note = '';
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      // 非完成 → 完成：增加消耗
      delta = clsHours;
      note = `课程标记完成 +${clsHours}节 (class ${id})`;
    } else if (oldStatus === 'completed' && newStatus !== 'completed') {
      // 完成 → 非完成：回退消耗
      delta = -clsHours;
      note = `课程取消完成 -${clsHours}节 (class ${id})`;
    }

    if (delta !== 0) {
      const targetPkg = await DB.prepare(
        `SELECT id FROM org_packages
         WHERE org_id = ? AND status IN ('pending', 'partial_paid')
         ORDER BY created_at DESC LIMIT 1`
      ).bind(clsOrgId).first();

      if (targetPkg) {
        await DB.prepare(
          `UPDATE org_packages SET used_hours = used_hours + ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(delta, targetPkg.id).run();

        await DB.prepare(
          `INSERT INTO org_hour_allocations (org_id, package_id, student_id, hours, notes, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(clsOrgId, targetPkg.id, existing.student_id, delta > 0 ? -delta : Math.abs(delta), note, 'system').run();
      }
    }
  }

  // 同步学生 used_hours（当 status 在 completed ↔ 其他 之间切换时）
  if (oldStatus !== newStatus) {
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      // 非完成 → 完成：增加学生 used_hours
      await DB.prepare(
        `UPDATE students SET used_hours = used_hours + ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(clsHours, existing.student_id).run();
    } else if (oldStatus === 'completed' && newStatus !== 'completed') {
      // 完成 → 非完成：减少学生 used_hours
      const student = await DB.prepare('SELECT used_hours FROM students WHERE id = ?').bind(existing.student_id).first();
      const newUsed = Math.max(0, (student?.used_hours || 0) - clsHours);
      await DB.prepare(
        `UPDATE students SET used_hours = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newUsed, existing.student_id).run();
    }
  }

  // 返回更新后的记录
  const cls = await DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
return c.json(success({
  id: cls.id,
  student_id: cls.student_id,
  package_id: cls.package_id,
  teacher: cls.teacher,
  teacher_id: cls.teacher_id,
  subject: cls.subject,
  hours: cls.hours,
  date: cls.date,
  start_time: cls.start_time,
  end_time: cls.end_time,
  content: cls.content,
  homework: cls.homework,
  notes: cls.notes,
  status: cls.status,
  class_link: cls.class_link,
  is_trial: cls.is_trial || 0,
  updated_at: cls.updated_at
 }));
});

 // 删除上课记录
classes.delete('/:id', validateParams(idParamSchema), async (c) => {
  const DB = c.env.DB;
  const { id } = c.req.validatedParams;

  // 检查上课记录是否存在
  const cls = await DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  if (!cls) {
    return c.json(error('NOT_FOUND', '上课记录不存在'), 404);
  }

  // 如果是已完成状态，恢复课时
  if (cls.status === 'completed') {
    // 1. 恢复学生 used_hours
    const student = await DB.prepare('SELECT total_hours, used_hours FROM students WHERE id = ?').bind(cls.student_id).first();
    const newUsed = Math.max(0, (student.used_hours || 0) - cls.hours);
    const newRemaining = (student.total_hours || 0) - newUsed;

    await DB.prepare('UPDATE students SET used_hours = ? WHERE id = ?').bind(newUsed, cls.student_id).run();

    // 记录学生课时变动（反向）
    await DB.prepare(`
      INSERT INTO hour_changes (student_id, type, amount, related_id, description)
      VALUES (?, 'class', ?, ?, ?)
    `).bind(cls.student_id, cls.hours, id, `删除上课记录 +${cls.hours}节`).run();

    // 2. 回退机构课时包 used_hours（与 PATCH 逻辑对称）
    if (cls.organization_id) {
      const targetPkg = await DB.prepare(
        `SELECT id FROM org_packages
         WHERE org_id = ? AND status IN ('pending', 'partial_paid')
         ORDER BY created_at DESC LIMIT 1`
      ).bind(cls.organization_id).first();

      if (targetPkg) {
        await DB.prepare(
          `UPDATE org_packages SET used_hours = MAX(0, used_hours - ?), updated_at = datetime('now') WHERE id = ?`
        ).bind(cls.hours, targetPkg.id).run();

        // 记录机构课时变动（反向）
        const note = `删除上课记录 -${cls.hours}节 (class ${id})`;
        await DB.prepare(
          `INSERT INTO org_hour_allocations (org_id, package_id, student_id, hours, notes, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(cls.organization_id, targetPkg.id, cls.student_id, cls.hours, note, 'system').run();
      }
    }
  }

  await DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();

  return c.json(success({ message: '上课记录已删除' }));
});

export default classes;
