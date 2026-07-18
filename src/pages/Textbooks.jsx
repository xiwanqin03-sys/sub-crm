import { useState, useEffect, useRef } from 'react';
import { Book, FileText, Upload, Sparkles, Loader, CheckCircle, XCircle, Trash2, ChevronRight, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { request } from '../store/api';

export default function Textbooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  useEffect(() => { loadBooks(); }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const resp = await request('/textbooks');
      setBooks(resp.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // 打开单个教材
  const openBook = async (code) => {
    try {
      const resp = await request(`/textbooks/book/${code}`);
      setSelectedBook(resp.data);
      setSelectedUnit(null);
    } catch (e) { alert('加载教材失败'); }
  };

  // 打开单元 (显示内容 + 上传 + 提取区)
  const openUnit = async (unit) => {
    setSelectedUnit(unit);
    // 拉内容
    try {
      const resp = await request(`/textbooks/content/${selectedBook.code}/${unit.unit_number}`);
      // 文件头有 404 时 resp 没有 data,就当成空
      if (resp.data) setUnitContent(resp.data);
      else setUnitContent(null);
    } catch {
      setUnitContent(null);
    }
  };

  const [unitContent, setUnitContent] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  const [extractError, setExtractError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // 浏览器端 PDF 转图片 (PDF.js render 到 canvas,导出 PNG blob)
  const [renderedImages, setRenderedImages] = useState([]);  // [{blob, url}]
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRenderedImages([]); setRenderError(''); setRenderError('');
    setExtractResult(null); setExtractError('');

    if (!file.type.includes('pdf')) {
      // 非PDF,直接当图片用
      setRenderedImages([{ blob: file, url: URL.createObjectURL(file) }]);
      return;
    }

    // PDF → 用 pdfjs 渲染每页为 PNG (动态加载,避免顶层 PDF worker 未初始化)
    setRendering(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images = [];
      const maxPages = Math.min(pdf.numPages, 8);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.85));
        images.push({ blob, url: URL.createObjectURL(blob) });
      }
      setRenderedImages(images);
      if (pdf.numPages > 8) setRenderError(`PDF 有 ${pdf.numPages} 页,只处理前 8 页`);
    } catch (err) {
      setRenderError('PDF 渲染失败: ' + err.message);
      console.error('PDF render error:', err);
    }
    setRendering(false);
  };

  // 触发上传图片 + LLM 提取 (预览,不保存)
  const handleExtractPreview = async () => {
    if (renderedImages.length === 0) { alert('请先选择 PDF 文件并等待转换为图片'); return; }
    setExtracting(true); setExtractError(''); setExtractResult(null);
    try {
      const fd = new FormData();
      renderedImages.forEach((img, i) => fd.append('images', img.blob, `page-${i+1}.png`));
      const url = `/textbooks/extract/${selectedBook.code}/${selectedUnit.unit_number}`;
      const r = await fetch(`https://sunnybridge-crm-api.xiwanqin03.workers.dev/api/v1${url}`, {
        method: 'POST',
        headers: { 'X-API-Key': 'sunnybridge-dev-key-2024' },
        body: fd
      });
      const resp = await r.json();
      if (resp.data) { setExtractResult(resp.data.content || resp.data); }
      else { setExtractError(resp.error?.message || '提取失败'); }
    } catch (e) { setExtractError(e.message); }
    setExtracting(false);
  };

  // 保存提取结果到 D1 (用 extract 返回的已存的内容, 或者用校对后的)
  const handleSaveContent = async (content) => {
    setSaving(true);
    try {
      const resp = await request(`/textbooks/content/${selectedBook.code}/${selectedUnit.unit_number}`, {
        method: 'POST',
        body: JSON.stringify({ ...content, extracted_by: 'llm' })
      });
      if (resp.data) { alert('✅ 已保存'); openUnit(selectedUnit); }
      else { alert(resp.error?.message || '保存失败'); }
    } catch (e) { alert('保存失败: ' + e.message); }
    setSaving(false);
  };

  // 删除 R2 里的 PDF
  const [pdfs, setPdfs] = useState([]);
  const loadPdfs = async () => {
    try {
      const resp = await request('/textbooks/pdfs');
      setPdfs(resp.data || []);
    } catch { setPdfs([]); }
  };
  useEffect(() => { loadPdfs(); }, []);

  // ====== 渲染 ======
  if (loading) return <div className="p-8 text-gray-500">加载中...</div>;

  // 三级视图: 教材列表 → 单本教材单元列表 → 单元详细 (PDF + 提取 + 编辑)
  if (!selectedBook) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Book className="w-6 h-6 text-primary-600" />📚 教材库</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(b => (
            <div key={b.code} onClick={() => openBook(b.code)} className="border rounded-lg p-4 hover:shadow-md hover:border-primary-300 cursor-pointer transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-800">{b.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{b.publisher} · {b.level}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded">{b.code}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText size={14} />
                {b.unit_count || 0} / {b.total_units} 单元已录入
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ====== 单本教材单元列表 ======
  if (selectedBook && !selectedUnit) {
    return (
      <div className="p-6 max-w-6xl">
        <button onClick={() => setSelectedBook(null)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4 text-sm">
          <ArrowLeft size={16} /> 返回教材列表
        </button>
        <h1 className="text-2xl font-bold mb-2">{selectedBook.name}</h1>
        <div className="text-sm text-gray-500 mb-6">{selectedBook.code} · {selectedBook.level} · {selectedBook.publisher}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {selectedBook.units?.map(u => (
            <div key={u.unit_number} onClick={() => openUnit(u)} className={`border rounded-lg p-3 hover:shadow-md cursor-pointer ${u.has_content ? 'border-green-300 bg-green-50' : 'hover:border-primary-300'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Unit {u.unit_number}</div>
                  <div className="text-sm text-gray-500 mt-1">{u.unit_title || '-'}</div>
                </div>
                {u.has_content ? (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded flex items-center gap-1"><CheckCircle size={12} />已录入</span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">待录入</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ====== 单元详细: PDF 上传 + LLM 提取 + 校对 + 保存 ======
  return (
    <div className="p-6 max-w-5xl">
      <button onClick={() => setSelectedUnit(null)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4 text-sm">
        <ArrowLeft size={16} /> 返回 {selectedBook.name}
      </button>
      <h1 className="text-2xl font-bold mb-1">{selectedBook.name} · Unit {selectedUnit.unit_number}</h1>
      <div className="text-gray-500 mb-6">{selectedUnit.unit_title}</div>

      {/* 已有内容 */}
      {unitContent && (
        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <div className="font-medium text-gray-700 mb-2">📚 当前已保存内容</div>
          <ContentView data={unitContent} />
        </div>
      )}

      {/* PDF 上传 + 提取 */}
      <div className="border-2 border-dashed rounded-lg p-6 mb-6">
        <div className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-600" /> AI 提取 (PDF → 词汇/句型/语法)
        </div>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="file"
            accept=".pdf,image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="text-sm"
          />
          <button
            onClick={handleExtractPreview}
            disabled={extracting || rendering || renderedImages.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {extracting ? <Loader className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {extracting ? 'AI 识别中... (10-30 秒)' : '🤖 AI 提取并保存'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">PDF 先在浏览器内渲染为图片,再发送给视觉 AI 识别。支持扫描版 PDF。</p>
        {renderError && <div className="mt-2 text-sm text-amber-600">⚠️ {renderError}</div>}
        {rendering && <div className="mt-2 text-sm text-gray-500 flex items-center gap-2"><Loader size={14} className="animate-spin" /> 正在把 PDF 转图片...</div>}
        {renderedImages.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded grid grid-cols-2 sm:grid-cols-4 gap-2">
            {renderedImages.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.url} alt={`page ${i+1}`} className="w-full h-auto rounded border" style={{maxHeight: '120px', objectFit: 'contain', backgroundColor: '#fff'}} />
                <span className="text-xs text-gray-600 absolute top-1 left-1 bg-white/80 px-1 rounded">P{i+1}</span>
              </div>
            ))}
          </div>
        )}
        {extractError && <div className="mt-2 text-sm text-red-600">❌ {extractError}</div>}
      </div>

      {/* 提取结果预览 / 校对 */}
      {extractResult && (
        <div className="border rounded-lg p-4 mb-6 bg-amber-50 border-amber-200">
          <div className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" /> 提取结果 (已自动保存)
          </div>
          <ContentView data={extractResult} />
        </div>
      )}

      {/* R2 已上传的 PDF 列表 */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-700 mb-3">📁 R2 中已上传的 PDF</h3>
        {pdfs.length === 0 ? (
          <div className="text-sm text-gray-400">还没有 PDF 文件</div>
        ) : (
          <ul className="space-y-1">
            {pdfs.map(p => (
              <li key={p.key} className="text-sm text-gray-600 flex items-center gap-2">
                <FileText size={14} />
                <a href={`https://sunnybridge-crm-api.xiwanqin03.workers.dev/api/v1/textbooks/pdf/${encodeURIComponent(p.key)}`}
                   target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                  {p.key}
                </a>
                <span className="text-xs text-gray-400">({(p.size/1024).toFixed(1)} KB)</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// 子组件: 显示 vocab/patterns/grammar 内容
function ContentView({ data }) {
  const vocab = data.vocab || [];
  const patterns = data.patterns || [];
  const grammar = data.grammar || [];

  return (
    <div className="space-y-3 text-sm">
      {vocab.length > 0 && (
        <div>
          <div className="font-medium mb-1">📚 词汇 ({vocab.length})</div>
          <ul className="space-y-1">
            {vocab.map((v, i) => (
              <li key={i} className="flex items-center gap-2">
                {v.is_core && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">核心</span>}
                <span className="font-medium">{v.word}</span>
                {v.translation && <span className="text-gray-500">{v.translation}</span>}
                {v.difficulty && <span className="text-xs text-gray-400">D{v.difficulty}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {patterns.length > 0 && (
        <div>
          <div className="font-medium mb-1">💬 句型 ({patterns.length})</div>
          <ul className="space-y-1">
            {patterns.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                {p.is_core && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">核心</span>}
                <span className="font-medium">{p.pattern}</span>
                {p.translation && <span className="text-gray-500">{p.translation}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {grammar.length > 0 && (
        <div>
          <div className="font-medium mb-1">📐 语法 ({grammar.length})</div>
          <ul className="space-y-1">
            {grammar.map((g, i) => (
              <li key={i} className="flex items-center gap-2">
                {g.is_core && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">核心</span>}
                <span className="font-medium">{g.point}</span>
                {g.example && <span className="text-gray-500">→ {g.example}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {vocab.length === 0 && patterns.length === 0 && grammar.length === 0 && (
        <div className="text-gray-400">无内容</div>
      )}
    </div>
  );
}
