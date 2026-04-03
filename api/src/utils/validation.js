import { z } from 'zod';

// 通用验证 Schema
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID必须是数字').transform(Number)
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(20)
});

// Students Schema
export const studentSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(100),
  phone: z.string().max(20).optional().nullable().transform(v => v || null),
  email: z.string().email('邮箱格式不正确').optional().nullable().transform(v => v || null),
  age: z.number().int().min(0).max(120).optional().nullable(),
  grade: z.string().max(50).optional().nullable().transform(v => v || null),
  parent_name: z.string().max(100).optional().nullable().transform(v => v || null),
  notes: z.string().optional().nullable().transform(v => v || null),
  status: z.enum(['active', 'inactive', 'graduated']).optional().default('active')
});

export const studentUpdateSchema = studentSchema.partial();

export const studentQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated']).optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

// Packages Schema
export const packageSchema = z.object({
  name: z.string().max(100).optional().or(z.literal('')),
  total: z.number().int().positive('总课时必须大于0'),
  price: z.number().min(0).optional(),
  purchase_date: z.string().optional(),
  expire_date: z.string().optional().or(z.literal('')).transform(v => {
    if (!v) return null;
    // 支持 YYYY/MM/DD 格式转换为 YYYY-MM-DD
    return v.replace(/\//g, '-');
  }),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'expired', 'refunded']).optional().default('active')
});

export const packageUpdateSchema = packageSchema.partial();

// Classes Schema
export const classSchema = z.object({
  package_id: z.number().int().positive().optional().nullable(),
  teacher_id: z.number().int().positive().optional().nullable(),
  teacher: z.string().max(100).optional().nullable().transform(v => v || null),
  subject: z.string().max(100).optional().nullable().transform(v => v || null),
  hours: z.number().positive('课时数必须大于0').default(1),
  date: z.string().optional(),
  start_time: z.string().optional().nullable().transform(v => v || null),
  end_time: z.string().optional().nullable().transform(v => v || null),
  content: z.string().optional().nullable().transform(v => v || null),
  homework: z.string().optional().nullable().transform(v => v || null),
  notes: z.string().optional().nullable().transform(v => v || null),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'absent']).default('completed')
});

export const classUpdateSchema = classSchema.partial();

// Payments Schema
export const paymentSchema = z.object({
  amount: z.number().positive('付款金额必须大于0'),
  payment_method: z.enum(['cash', 'wechat', 'alipay', 'bank', 'other']).optional(),
  package_id: z.number().int().positive().optional(),
  description: z.string().optional().or(z.literal('')),
  date: z.string().optional(),
  receipt_number: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal(''))
});

// Teachers Schema
export const teacherSchema = z.object({
  name: z.string().min(1, '教师姓名不能为空').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  subjects: z.string().optional().or(z.literal('')), // JSON string
  hourly_rate: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  notes: z.string().optional().or(z.literal(''))
});

export const teacherUpdateSchema = teacherSchema.partial();

export const teacherQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

// Settings Schema
export const settingsSchema = z.record(z.string());

/**
 * 验证请求体
 */
export const validate = (schema) => {
  return async (c, next) => {
    try {
      const body = await c.req.json();
      const result = schema.parse(body);
      c.req.validated = result;
      await next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const details = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return c.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details
          },
          meta: { timestamp: new Date().toISOString() }
        }, 400);
      }
      throw err;
    }
  };
};

/**
 * 验证查询参数
 */
export const validateQuery = (schema) => {
  return async (c, next) => {
    try {
      const query = {};
      for (const [key, value] of c.req.queries()) {
        query[key] = value[0];
      }
      const result = schema.parse(query);
      c.req.validatedQuery = result;
      await next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '查询参数验证失败',
            details: err.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          meta: { timestamp: new Date().toISOString() }
        }, 400);
      }
      throw err;
    }
  };
};

/**
 * 验证 URL 参数
 */
export const validateParams = (schema) => {
  return async (c, next) => {
    try {
      const params = c.req.param();
      const result = schema.parse(params);
      c.req.validatedParams = result;
      await next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'URL参数验证失败',
            details: err.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          meta: { timestamp: new Date().toISOString() }
        }, 400);
      }
      throw err;
    }
  };
};