/**
 * 教材库路由 - textbooks / textbook_units / unit_content
 * /api/v1/textbooks
 *   GET /                  → 教材列表
 *   GET /:code              → 单本教材详情 + 单元列表
 *   GET /units              → 所有单元列表 (可选按 textbook_code 过滤)
 *   GET /units/:code/:num   → 单元详情
 *   GET /suggest            → ⭐ CRM 最常用: 根据 textbook_code + unit_number 推荐内容
 *   GET /content/:code/:num → 单元内容 (vocab/patterns/grammar)
 *   POST /content/:code/:num → 写入/更新单元内容 (Admin, AI提取后)
 */
import { Hono } from 'hono';

const textbooks = new Hono();

// ============================================================
// ⭐ GET /suggest — 课后反馈词汇推荐 (CRM 最高频调用)
// Query: textbook_code=EU-L1&unit_number=3
// 返回: { vocab: [...], patterns: [...], grammar: [...] }
// ============================================================
textbooks.get('/suggest', async (c) => {
  const DB = c.env.DB;
  const code = c.req.query('textbook_code');
  const unitNum = parseInt(c.req.query('unit_number'));

  if (!code || !unitNum) {
    return c.json({ error: { code: 'BAD_REQUEST', message: '需要 textbook_code 和 unit_number 参数' } }, 400);
  }

  // � приват
  const content = await DB.prepare(`
    SELECT uc.vocab, uc.patterns, uc.grammar
    FROM unit_content uc
    WHERE uc.textbook_code = ? AND uc.unit_number = ?
  `).bind(code, unitNum).first();

  if (!content) {
    // 无内容,返回单元基本信息供前端展示
    const unit = await DB.prepare(`
      SELECT unit_title, lesson_count
      FROM textbook_units
      WHERE textbook_code = ? AND unit_number = ?
    `).bind(code, unitNum).first();

    return c.json({
      data: {
        textbook_code: code,
        unit_number: unitNum,
        unit_title: unit?.unit_title || null,
        lesson_count: unit?.lesson_count || null,
        vocab: [],
        patterns: [],
        grammar: [],
        has_content: false
      }
    });
  }

  // 解析 JSON 字段
  let vocab = [], patterns = [], grammar = [];
  try { vocab = JSON.parse(content.vocab || '[]'); } catch {}
  try { patterns = JSON.parse(content.patterns || '[]'); } catch {}
  try { grammar = JSON.parse(content.grammar || '[]'); } catch {}

  // 查单元标题
  const unit = await DB.prepare(`
    SELECT unit_title, lesson_count
    FROM textbook_units
    WHERE textbook_code = ? AND unit_number = ?
  `).bind(code, unitNum).first();

  // 按 is_core 优先 + difficulty 排序
  const sortByCore = (a, b) => {
    if (a.is_core && !b.is_core) return -1;
    if (!a.is_core && b.is_core) return 1;
    return (a.difficulty || 99) - (b.difficulty || 99);
  };
  vocab.sort(sortByCore);
  patterns.sort(sortByCore);
  grammar.sort(sortByCore);

  return c.json({
    data: {
      textbook_code: code,
      unit_number: unitNum,
      unit_title: unit?.unit_title || null,
      lesson_count: unit?.lesson_count || null,
      vocab,
      patterns,
      grammar,
      has_content: true
    }
  });
});

// ============================================================
// GET / — 教材列表
// ============================================================
textbooks.get('/', async (c) => {
  const DB = c.env.DB;
  const results = await DB.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM textbook_units WHERE textbook_id = t.id) as unit_count
    FROM textbooks t
    WHERE t.is_active = 1
    ORDER BY t.id ASC
  `).all();

  const data = results.results?.map(t => ({
    id: t.id,
    code: t.code,
    name: t.name,
    series: t.series,
    publisher: t.publisher,
    level: t.level,
    total_units: t.total_units,
    unit_count: t.unit_count,
    description: t.description
  })) || [];

  return c.json({ data });
});

// ============================================================
// GET /:code — 单本教材详情 + 单元列表
// ============================================================
textbooks.get('/:code', async (c) => {
  const DB = c.env.DB;
  const code = c.req.param('code');

  const book = await DB.prepare('SELECT * FROM textbooks WHERE code = ?').bind(code).first();
  if (!book) {
    return c.json({ error: { code: 'NOT_FOUND', message: '教材不存在' } }, 404);
  }

  const units = await DB.prepare(`
    SELECT u.*,
      CASE WHEN uc.id IS NOT NULL THEN 1 ELSE 0 END as has_content
    FROM textbook_units u
    LEFT JOIN unit_content uc ON uc.unit_id = u.id
    WHERE u.textbook_code = ? AND u.is_active = 1
    ORDER BY u.unit_number ASC
  `).bind(code).all();

  return c.json({
    data: {
      ...book,
      units: units.results?.map(u => ({
        id: u.id,
        unit_number: u.unit_number,
        unit_title: u.unit_title,
        lesson_count: u.lesson_count,
        has_content: u.has_content === 1
      })) || []
    }
  });
});

// ============================================================
// GET /content/:code/:num — 单元完整内容
// ============================================================
textbooks.get('/content/:code/:num', async (c) => {
  const DB = c.env.DB;
  const code = c.req.param('code');
  const num = parseInt(c.req.param('num'));

  const content = await DB.prepare(`
    SELECT uc.*, u.unit_title
    FROM unit_content uc
    JOIN textbook_units u ON u.id = uc.unit_id
    WHERE uc.textbook_code = ? AND uc.unit_number = ?
  `).bind(code, num).first();

  if (!content) {
    return c.json({ error: { code: 'NOT_FOUND', message: '该单元内容尚未录入' } }, 404);
  }

  return c.json({
    data: {
      ...content,
      vocab: safeParse(content.vocab),
      patterns: safeParse(content.patterns),
      grammar: safeParse(content.grammar)
    }
  });
});

// ============================================================
// POST /content/:code/:num — 写入/更新单元内容 (Admin, AI提取后)
// Body: { vocab: [...], patterns: [...], grammar: [...], extracted_by: 'claude' }
// ============================================================
textbooks.post('/content/:code/:num', async (c) => {
  const DB = c.env.DB;
  const code = c.req.param('code');
  const num = parseInt(c.req.param('num'));

  // 查 unit_id
  const unit = await DB.prepare(`
    SELECT id FROM textbook_units WHERE textbook_code = ? AND unit_number = ?
  `).bind(code, num).first();
  if (!unit) {
    return c.json({ error: { code: 'NOT_FOUND', message: '单元不存在' } }, 404);
  }

  const body = await c.req.json();
  const vocab = JSON.stringify(body.vocab || []);
  const patterns = JSON.stringify(body.patterns || []);
  const grammar = JSON.stringify(body.grammar || []);
  const extractedBy = body.extracted_by || 'manual';

  // UPSERT (INSERT OR REPLACE)
  const existing = await DB.prepare(`
    SELECT id FROM unit_content WHERE unit_id = ?
  `).bind(unit.id).first();

  if (existing) {
    await DB.prepare(`
      UPDATE unit_content
      SET vocab = ?, patterns = ?, grammar = ?, extracted_by = ?, extracted_at = datetime('now'), updated_at = datetime('now')
      WHERE unit_id = ?
    `).bind(vocab, patterns, grammar, extractedBy, unit.id).run();
  } else {
    await DB.prepare(`
      INSERT INTO unit_content (unit_id, textbook_code, unit_number, vocab, patterns, grammar, extracted_by, extracted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(unit.id, code, num, vocab, patterns, grammar, extractedBy).run();
  }

  return c.json({ data: { textbook_code: code, unit_number: num, saved: true } });
});

// ============================================================
// Helper
// ============================================================
function safeParse(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

export default textbooks;
