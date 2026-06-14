/**
 * Leads 路由 - 潜在客户/预约表单
 * POST /api/v1/leads - 提交表单 → D1 + Resend 邮件通知
 */
import { Hono } from 'hono';

const leads = new Hono();

// 提交预约表单（公开接口，无需认证）
leads.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, phone, email, age, course, source, message } = body;

    // 基本验证
    if (!name || !phone) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '姓名和联系方式为必填项' }
      }, 400);
    }

    // 1. 写入 D1 数据库
    const DB = c.env.DB;
    const result = await DB.prepare(`
      INSERT INTO leads (name, phone, email, age, course, source, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(name, phone, email || '', age || '', course || '', source || 'website', message || '').run();

    console.log('[leads] DB insert result:', JSON.stringify(result));

    // 2. 发送邮件通知
    const resendKey = c.env.RESEND_API_KEY;
    if (resendKey) {
      const emailBody = `
新预约通知

📍 来源：${source || '网站首页'}
👤 学生姓名：${name}
📱 联系方式：${phone}
📧 邮箱：${email || '未填写'}
🎂 年龄：${age || '未填写'}
📚 课程级别：${course || '未填写'}
💬 留言：${message || '无'}
⏰ 提交时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`.trim();

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SunnyBridge <onboarding@resend.dev>',
          to: ['xiwanqin03@gmail.com'],
          subject: `📩 新预约 - ${name} (${phone})`,
          text: emailBody
        })
      });

      const resendResult = await res.json();
      console.log('[leads] Resend response:', JSON.stringify(resendResult));

      if (!res.ok) {
        console.error('[leads] Resend error:', JSON.stringify(resendResult));
      }
    } else {
      console.warn('[leads] RESEND_API_KEY not configured, skipping email');
    }

    return c.json({
      success: true,
      message: '预约提交成功！我们会尽快与您联系。',
      data: { id: result.meta?.last_row_id }
    });

  } catch (err) {
    console.error('[leads] Error:', err.message);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '提交失败，请稍后重试' }
    }, 500);
  }
});

export default leads;