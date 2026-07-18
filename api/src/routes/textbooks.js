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
 *
 *   POST /upload            → 上传 PDF 到 R2 (multipart/form-data)
 *   GET  /pdfs               → 列出 R2 中的 PDF 文件
 *   GET  /pdf/:key           → 从 R2 下载 PDF (返回文件流)
 *   DELETE /pdf/:key         → 删除 R2 中的 PDF
 *   POST /extract            → ⭐ 上传 PDF + 调 LLM 提取 → 返回 JSON (不存库)
 *   POST /extract/:code/:num → ⭐ 上传 PDF + 调 LLM 提取 + 自动写入 unit_content
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

// ⚠️ 静态路径路由必须在 /:code 之前,否则会被 /:code 捕获
// (R2 upload / pdfs / pdf / extract 等已在 /:code 之前声明)

// ============================================================
// GET /book/:code — 单本教材详情 + 单元列表
// 用 /book/:code 路径,避免和 /pdfs /upload 等静态路径冲突
// ============================================================
textbooks.get('/book/:code', async (c) => {
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

// ============================================================
// LLM 提取 Prompt (同 scripts/extract_textbook.py)
// ============================================================
const EXTRACTION_PROMPT = `You are a textbook content extractor. Given the text content of a language textbook unit, extract vocabulary, sentence patterns, and grammar points into structured JSON.

Return ONLY valid JSON (no markdown fences, no explanation) in this exact schema:

{
  "vocab": [
    {"word": "apple", "translation": "苹果", "is_core": true, "difficulty": 1}
  ],
  "patterns": [
    {"pattern": "I like apples.", "translation": "我喜欢苹果。", "is_core": true}
  ],
  "grammar": [
    {"point": "Present Simple", "example": "She plays tennis.", "is_core": true}
  ]
}

Rules:
- "is_core": true if the item appears prominently in the unit's main vocabulary list or is a target pattern/grammar; false if supplementary.
- "difficulty": 1 (basic/critical), 2 (intermediate), 3 (advanced).
- If a translation is provided in parentheses or list items, include it; otherwise leave translation as null.
- Clean up bullet artifacts (e.g., (cid:127), •, -) from words/patterns.
- If no vocab/patterns/grammar is found, return an empty array for that field.
- Return ONLY the JSON object. No code fences, no preamble.`;

// ============================================================
// 调 LLM 做结构化提取
// ============================================================
async function callLLM(c, textContent) {
  const baseUrl = c.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = c.env.LLM_API_KEY;
  const model = c.env.LLM_MODEL || 'gpt-4o';

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured. Run: wrangler secret put LLM_API_KEY');
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Here is the textbook unit content:\n\n${textContent}` }
      ],
      temperature: 0.1,
      max_tokens: 4096
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`LLM API error ${resp.status}: ${errText.substring(0, 200)}`);
  }

  const data = await resp.json();
  let raw = data.choices?.[0]?.message?.content || '';
  // 去掉 ```json 包裹
  raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(raw);
  } catch {
    return { vocab: [], patterns: [], grammar: [], _raw: raw.substring(0, 500) };
  }
}

// 从 PDF ArrayBuffer 提取文字 (用 unpdf,Workers 兼容)
// 然后把文字喂给 LLM 做结构化提取
async function callLLMWithPDF(c, pdfBuffer, filename) {
  const baseUrl = c.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = c.env.LLM_API_KEY;
  const model = c.env.LLM_MODEL || 'gpt-4o';

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured. Run: wrangler secret put LLM_API_KEY');
  }

  // 1. unpdf 提取文字
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdfBytes = new Uint8Array(pdfBuffer);
  const pdf = await getDocumentProxy(pdfBytes);
  const { text: pdfText } = await extractText(pdf, { mergePages: true });

  if (!pdfText || pdfText.trim().length === 0) {
    throw new Error('PDF 提取不到文字 (可能是扫描版 PDF,需要 OCR)');
  }

  // 2. 调 LLM
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Here is the textbook unit content (extracted from PDF ${filename}):\n\n${pdfText}` }
      ],
      temperature: 0.1,
      max_tokens: 2048
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`LLM API error ${resp.status}: ${errText.substring(0, 200)}`);
  }

  const data = await resp.json();
  let raw = data.choices?.[0]?.message?.content || '';
  raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(raw);
  } catch {
    return { vocab: [], patterns: [], grammar: [], _raw: raw.substring(0, 500) };
  }
}

// ============================================================
// POST /upload — 上传 PDF 到 R2
// multipart/form-data, field name: "pdf"
// 可选: textbook_code, unit_number (会作为 R2 key 前缀)
// ============================================================
textbooks.post('/upload', async (c) => {
  const R2 = c.env.TEXTBOOKS_R2;
  if (!R2) return c.json({ error: { code: 'R2_NOT_BOUND', message: 'R2 bucket not configured' } }, 500);

  const formData = await c.req.formData();
  const file = formData.get('pdf');
  if (!file || !file.name) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Missing pdf file' } }, 400);
  }

  const textbookCode = formData.get('textbook_code') || 'unknown';
  const unitNumber = formData.get('unit_number') || '0';
  const key = `${textbookCode}/Unit${unitNumber}_${file.name}`;

  const arrayBuffer = await file.arrayBuffer();
  await R2.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type || 'application/pdf' }
  });

  return c.json({
    data: {
      key,
      filename: file.name,
      size: arrayBuffer.byteLength,
      textbook_code: textbookCode,
      unit_number: unitNumber
    }
  });
});

// ============================================================
// GET /pdfs — 列出 R2 中的 PDF
// ============================================================
textbooks.get('/pdfs', async (c) => {
  const R2 = c.env.TEXTBOOKS_R2;
  if (!R2) return c.json({ error: { code: 'R2_NOT_BOUND', message: 'R2 bucket not configured' } }, 500);

  const listed = await R2.list();
  const files = listed.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded?.toISOString()
  }));

  return c.json({ data: files });
});

// ============================================================
// GET /pdf/:key — 下载 PDF (key 用 URL 编码,可能含 /)
// ============================================================
textbooks.get('/pdf/:key', async (c) => {
  const R2 = c.env.TEXTBOOKS_R2;
  if (!R2) return c.json({ error: { code: 'R2_NOT_BOUND' } }, 500);

  const key = decodeURIComponent(c.req.param('key'));
  const object = await R2.get(key);
  if (!object) return c.json({ error: { code: 'NOT_FOUND', message: 'PDF not found' } }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/pdf',
      'Content-Disposition': `inline; filename="${key.split('/').pop()}"`
    }
  });
});

// ============================================================
// DELETE /pdf/:key — 删除 R2 中的 PDF
// ============================================================
textbooks.delete('/pdf/:key', async (c) => {
  const R2 = c.env.TEXTBOOKS_R2;
  if (!R2) return c.json({ error: { code: 'R2_NOT_BOUND' } }, 500);

  const key = decodeURIComponent(c.req.param('key'));
  await R2.delete(key);
  return c.json({ data: { deleted: key } });
});

// ============================================================
// POST /extract — 上传图片(可多张) → 调 vision LLM → 返回 JSON (不存库)
// 用途: Admin 页面"预览提取结果"按钮
// Form fields: images[] (FileList,1-8张) 可选 textbook_code unit_number
// ============================================================
textbooks.post('/extract', async (c) => {
  const formData = await c.req.formData();

  // 收集所有 images[] 文件
  const images = formData.getAll('images').filter(f => f && f.name);

  if (images.length === 0) {
    // 兼容: 也许传的是 pdf 字段? Workers 端 unpdf 解析试一下
    const pdf = formData.get('pdf');
    if (!pdf) return c.json({ error: { code: 'BAD_REQUEST', message: 'Missing images[] or pdf' } }, 400);

    // fallback unpdf 文字提取
    try {
      const arrayBuffer = await pdf.arrayBuffer();
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdfBytes = new Uint8Array(arrayBuffer);
      const pdfDoc = await getDocumentProxy(pdfBytes);
      const { text: pdfText } = await extractText(pdfDoc, { mergePages: true });
      if (pdfText && pdfText.trim().length > 0) {
        const result = await callLLM(c, pdfText);
        return c.json({ data: result, _method: 'unpdf' });
      }
      return c.json({ error: { code: 'NO_TEXT', message: 'PDF 提取不到文字 (可能是扫描版,需用浏览器先转图片后上传)' } }, 400);
    } catch (err) {
      return c.json({ error: { code: 'UNPDF_ERROR', message: err.message } }, 500);
    }
  }

  // 有图片 → 调 vision LLM
  try {
    const result = await callLLMWithImages(c, images);
    return c.json({ data: result, _method: 'vision' });
  } catch (err) {
    return c.json({ error: { code: 'LLM_ERROR', message: err.message } }, 502);
  }
});

// ============================================================
// POST /extract/:code/:num — 上传图片 → R2 备份 + vision LLM 提取 + 写入 unit_content
// 用途: Admin 页面"AI 提取并保存"按钮 (扫描版 PDF 转图片后)
// ============================================================
textbooks.post('/extract/:code/:num', async (c) => {
  const R2 = c.env.TEXTBOOKS_R2;
  const DB = c.env.DB;
  const code = c.req.param('code');
  const num = parseInt(c.req.param('num'));

  const formData = await c.req.formData();
  const images = formData.getAll('images').filter(f => f && f.name);
  const pdf = formData.get('pdf');  // 也允许多传 PDF 原文件 (备份用)

  // 查 unit_id
  const unit = await DB.prepare(`
    SELECT id FROM textbook_units WHERE textbook_code = ? AND unit_number = ?
  `).bind(code, num).first();
  if (!unit) return c.json({ error: { code: 'NOT_FOUND', message: 'Unit not found' } }, 404);

  let content;
  try {
    if (images.length > 0) {
      content = await callLLMWithImages(c, images);
    } else if (pdf) {
      // 无图但只有 PDF → unpdf 尝试文字提取
      const arrayBuffer = await pdf.arrayBuffer();
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdfBytes = new Uint8Array(arrayBuffer);
      const pdfDoc = await getDocumentProxy(pdfBytes);
      const { text: pdfText } = await extractText(pdfDoc, { mergePages: true });
      if (!pdfText || pdfText.trim().length === 0) {
        return c.json({ error: { code: 'NO_TEXT', message: 'PDF 提取不到文字 (扫描版?). 请在前端把 PDF 转图片后再上传' } }, 400);
      }
      content = await callLLM(c, pdfText);
    } else {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Missing images[] or pdf' } }, 400);
    }
  } catch (err) {
    return c.json({ error: { code: 'LLM_ERROR', message: err.message } }, 502);
  }

  // 上传到 R2 (有 PDF 就存 PDF,否则存第一张图)
  let r2Key = '';
  if (pdf) {
    r2Key = `${code}/Unit${num}_${pdf.name}`;
    await R2.put(r2Key, await pdf.arrayBuffer(), { httpMetadata: { contentType: 'application/pdf' } });
  } else if (images.length > 0 && R2) {
    r2Key = `${code}/Unit${num}_${images[0].name}`;
    await R2.put(r2Key, await images[0].arrayBuffer(), { httpMetadata: { contentType: images[0].type } });
  }

  // 写入 unit_content
  const vocab = JSON.stringify(content.vocab || []);
  const patterns = JSON.stringify(content.patterns || []);
  const grammar = JSON.stringify(content.grammar || []);

  const existing = await DB.prepare('SELECT id FROM unit_content WHERE unit_id = ?').bind(unit.id).first();
  if (existing) {
    await DB.prepare(`
      UPDATE unit_content SET vocab = ?, patterns = ?, grammar = ?, extracted_by = 'llm', extracted_at = datetime('now'), updated_at = datetime('now')
      WHERE unit_id = ?
    `).bind(vocab, patterns, grammar, unit.id).run();
  } else {
    await DB.prepare(`
      INSERT INTO unit_content (unit_id, textbook_code, unit_number, vocab, patterns, grammar, extracted_by, extracted_at)
      VALUES (?, ?, ?, ?, ?, ?, 'llm', datetime('now'))
    `).bind(unit.id, code, num, vocab, patterns, grammar).run();
  }

  return c.json({
    data: {
      textbook_code: code,
      unit_number: num,
      r2_key: r2Key,
      content,
      saved: true
    }
  });
});

// ============================================================
// Vision LLM: 用图片直接读
// 默认 glm-4.6v-flash (免费视觉模型,有限流)
// 限流时自动 fallback 到 glm-4v (付费,但稳定)
// ============================================================
async function callLLMWithImages(c, imageFiles, opts = {}) {
  const baseUrl = c.env.LLM_BASE_URL || 'https://api.z.ai/api/paas/v4';
  const apiKey = c.env.LLM_API_KEY;
  const model = c.env.LLM_MODEL || 'glm-4.6v-flash';
  // 限流时的 fallback 模型列表 (z.ai 平台上的视觉模型)
  // glm-4.6v 付费版,glm-4.6v-flash 免费版但限流
  // glm-4v/z.ai 不存在;glm-4.5/glm-4.6 不支持图片输入,不要加
  const fallbackModels = ['glm-4.6v-flash', 'glm-4.6v'];

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured. Run: wrangler secret put LLM_API_KEY');
  }

  // 把所有图片转 base64 (用 FileReader-like 方式)
  // Workers 里没有 FileReader,但可以用 btoa + Uint8Array 的 chunk
  function arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const CHUNK = 0x1000;  // 4KB chunk,远小于 fromCharCode.apply 安全上限
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const end = Math.min(i + CHUNK, bytes.length);
      let s = '';
      for (let j = i; j < end; j++) {
        s += String.fromCharCode(bytes[j]);
      }
      binary += s;
    }
    return btoa(binary);
  }

  const imageContents = [];
  const maxPages = opts.maxPages || 8;
  for (let i = 0; i < imageFiles.length; i++) {
    const f = imageFiles[i];
    if (i >= maxPages) break;
    const buf = await f.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    const mime = f.type || 'image/png';
    imageContents.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${b64}` }
    });
  }

  // 单元模式 vs 整本书模式
  const prompt = opts.bookMode
    ? `You are given ${imageFiles.length} pages from a language textbook. Identify which unit each page belongs to, then extract vocabulary, patterns, and grammar PER UNIT.

IMPORTANT — Unit identification rules:
- "Welcome" / "Intro" / "Starter" pages (greetings, alphabet, numbers 1-10, classroom objects intro) belong to unit_number = 0 (NOT Unit 1)
- "Review" / "Show What You Know" / "Checkpoints" pages belong to the LAST unit_number in the book (e.g., Unit 10)
- Cover page, Table of Contents, title page → SKIP (don't create a unit)
- Pages explicitly labeled "Unit 1", "Unit 2" etc. → use that unit_number

Return ONLY valid JSON array (no fences, no preamble). Each element is one unit:

[
  {
    "unit_number": 0,
    "unit_title": "Welcome",
    "vocab": [{"word":"hello","translation":"你好","is_core":true,"difficulty":1}],
    "patterns": [{"pattern":"Hi, I'm Tom.","translation":"你好,我是 Tom。","is_core":true}],
    "grammar": []
  },
  {
    "unit_number": 1,
    "unit_title": "Hello!",
    "vocab": [{"word":"paper","translation":"纸","is_core":true,"difficulty":1}],
    "patterns": [...],
    "grammar": [...]
  },
  ...
]

Rules:
- Merge all pages of the same unit into ONE entry (not one per page)
- unit_number=0 for Welcome/Intro, 1-10 for real units, ~99 for end-of-book review if not labeled
- is_core=true for items prominently in the unit's target vocabulary list
- difficulty: 1 (basic/critical), 2 (intermediate), 3 (advanced)
- Clean up bullet artifacts (cid:127, •, -) from words/patterns
- Return ONLY the JSON array. No fences, no explanation.`
    : EXTRACTION_PROMPT;

  const userContent = opts.bookMode
    ? imageContents  // book mode: just images are enough
    : [
        { type: 'text', text: `Please extract vocabulary, sentence patterns, and grammar from these textbook page images (${imageFiles.length} pages).` },
        ...imageContents
      ];

  async function tryCall(m) {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: m, messages: [{ role: 'system', content: prompt }, { role: 'user', content: userContent }], temperature: 0.1, max_tokens: opts.bookMode ? 4096 : 2048 })
    });
    return resp;
  }

  // 按优先级尝试所有模型,429 限流就 fallback
  const modelsToTry = [model, ...fallbackModels.filter(m => m !== model)];
  let lastError = '';
  for (const m of modelsToTry) {
    let resp;
    try { resp = await tryCall(m); } catch (err) { lastError = err.message; continue; }

    if (resp.ok) {
      const data = await resp.json();
      let raw = data.choices?.[0]?.message?.content || '';
      raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      try { return JSON.parse(raw); }
      catch { return { vocab: [], patterns: [], grammar: [], _raw: raw.substring(0, 500), _model: m }; }
    }

    if (resp.status === 429) {
      // 限流 → 重试 + fallback
      await new Promise(r => setTimeout(r, 3000));
      try { resp = await tryCall(m); } catch (err) { lastError = err.message; continue; }
      if (resp.ok) {
        const data = await resp.json();
        let raw = data.choices?.[0]?.message?.content || '';
        raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        try { return JSON.parse(raw); }
        catch { return { vocab: [], patterns: [], grammar: [], _raw: raw.substring(0, 500), _model: m }; }
      }
      if (resp.status === 429) {
        // 当前模型限流,换下一个
        lastError = `${m} 限流(429)`;
        continue;
      }
    }

    // 非限流错误 → 报告并 fallback
    const errText = await resp.text();
    lastError = `LLM API ${resp.status} ${m}: ${errText.substring(0, 100)}`;
    // 但模型不存在之类的错误(404) 就跳到 fallback
  }

  throw new Error(`所有模型都失败: ${lastError}`);
}

// ============================================================
// POST /extract-book/:code — 整本书图片 → AI 识别每个 unit → 全部写入 D1
// Form: images[] (多页图片)
// ============================================================
textbooks.post('/extract-book/:code', async (c) => {
  const R2 = c.env.TEXTBOOKS_R2;
  const DB = c.env.DB;
  const code = c.req.param('code');

  const formData = await c.req.formData();
  const images = formData.getAll('images').filter(f => f && f.name);
  const pdf = formData.get('pdf');  // 可选,有就存到 R2 备份

  if (images.length === 0) return c.json({ error: { code: 'BAD_REQUEST', message: 'Missing images[]' } }, 400);

  // 查这本书所有 unit 列表,用于稍后匹配
  const units = await DB.prepare(`
    SELECT id, unit_number FROM textbook_units
    WHERE textbook_code = ? AND is_active = 1
    ORDER BY unit_number ASC
  `).bind(code).all();
  const unitMap = new Map();
  (units.results || []).forEach(u => unitMap.set(u.unit_number, u.id));

  // 调 LLM book mode
  let bookContent;  // [{unit_number, vocab, patterns, grammar}]
  try {
    bookContent = await callLLMWithImages(c, images, { bookMode: true, maxPages: 20 });
    // 如果返回的不是 array,说明 LLM 输出失败
    if (!Array.isArray(bookContent)) {
      return c.json({ error: { code: 'LLM_PARSE_ERROR', message: 'LLM 返回不是 unit 数组', _raw: JSON.stringify(bookContent).substring(0, 200) } }, 502);
    }
  } catch (err) {
    return c.json({ error: { code: 'LLM_ERROR', message: err.message } }, 502);
  }

  // R2 备份
  let r2Key = '';
  if (pdf) {
    r2Key = `${code}/whole_book_${pdf.name}`;
    await R2.put(r2Key, await pdf.arrayBuffer(), { httpMetadata: { contentType: 'application/pdf' } });
  }

  // 写入每个 unit 的 content
  const written = [];
  for (const item of bookContent) {
    const unitId = unitMap.get(item.unit_number);
    if (!unitId) continue;  // unit_number 不在预定义列表,跳过

    const vocab = JSON.stringify(item.vocab || []);
    const patterns = JSON.stringify(item.patterns || []);
    const grammar = JSON.stringify(item.grammar || []);

    const existing = await DB.prepare('SELECT id FROM unit_content WHERE unit_id = ?').bind(unitId).first();
    if (existing) {
      await DB.prepare(`UPDATE unit_content SET vocab = ?, patterns = ?, grammar = ?, extracted_by = 'llm', extracted_at = datetime('now'), updated_at = datetime('now') WHERE unit_id = ?`)
        .bind(vocab, patterns, grammar, unitId).run();
    } else {
      await DB.prepare(`INSERT INTO unit_content (unit_id, textbook_code, unit_number, vocab, patterns, grammar, extracted_by, extracted_at) VALUES (?, ?, ?, ?, ?, ?, 'llm', datetime('now'))`)
        .bind(unitId, code, item.unit_number, vocab, patterns, grammar).run();
    }
    written.push({ unit_number: item.unit_number, vocab_count: (item.vocab||[]).length, patterns_count: (item.patterns||[]).length });
  }

  return c.json({
    data: {
      textbook_code: code,
      pages_sent: images.length,
      units_detected: bookContent.length,
      units_written: written.length,
      written,
      r2_key: r2Key
    }
  });
});

export default textbooks;
