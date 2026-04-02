/**
 * 统一错误处理中间件
 */
export const errorHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Error:', err);

    // 处理 Hono 的 HTTP 错误
    if (err.status && err.message) {
      return c.json({
        error: {
          code: err.name || 'HTTP_ERROR',
          message: err.message
        },
        meta: { timestamp: new Date().toISOString() }
      }, err.status);
    }

    // 数据库约束错误
    if (err.message && err.message.includes('FOREIGN KEY constraint')) {
      return c.json({
        error: {
          code: 'FOREIGN_KEY_ERROR',
          message: '关联的资源不存在'
        },
        meta: { timestamp: new Date().toISOString() }
      }, 400);
    }

    if (err.message && err.message.includes('UNIQUE constraint')) {
      return c.json({
        error: {
          code: 'DUPLICATE',
          message: '资源已存在'
        },
        meta: { timestamp: new Date().toISOString() }
      }, 409);
    }

    // 默认服务器错误
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: c.env.DEBUG ? err.message : '服务器内部错误'
      },
      meta: { timestamp: new Date().toISOString() }
    }, 500);
  }
};

/**
 * 404 处理
 */
export const notFound = (c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在'
    },
    meta: { timestamp: new Date().toISOString() }
  }, 404);
};