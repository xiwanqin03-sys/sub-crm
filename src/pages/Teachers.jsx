import { useState, useEffect } from 'react';
import { User, Plus, Edit2, Trash2, Phone, Mail, BookOpen, Search, ExternalLink, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { teacherOps } from '../store';
import OrgFilter from '../components/OrgFilter';
import { setSelectedOrg } from '../store/api';

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrgState] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subjects: '',
    hourly_rate: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const data = await teacherOps.getAll();
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load error:', err);
      setTeachers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const teacherData = {
        ...formData,
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      };

      if (editingTeacher) {
        await teacherOps.update(editingTeacher.id, teacherData);
      } else {
        await teacherOps.add(teacherData);
      }

      setShowModal(false);
      setEditingTeacher(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        subjects: '',
        hourly_rate: '',
        status: 'active',
        notes: ''
      });
      loadTeachers();
    } catch (err) {
      alert('保存失败：' + err.message);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      phone: teacher.phone || '',
      email: teacher.email || '',
      subjects: (teacher.subjects || []).join(', '),
      hourly_rate: teacher.hourly_rate || '',
      status: teacher.status,
      notes: teacher.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个教师吗？')) return;
    try {
      await teacherOps.delete(id);
      loadTeachers();
    } catch (err) {
      alert('删除失败：' + err.message);
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.phone?.includes(searchTerm) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTeachers = filteredTeachers.filter(t => t.status === 'active');
  const inactiveTeachers = filteredTeachers.filter(t => t.status === 'inactive');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">教师管理</h1>
        <button
          onClick={() => {
            setEditingTeacher(null);
            setFormData({
              name: '',
              phone: '',
              email: '',
              subjects: '',
              hourly_rate: '',
              status: 'active',
              notes: ''
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          添加教师
        </button>
      </div>

      {/* 搜索框 + 机构筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索教师姓名、电话、邮箱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <OrgFilter selectedOrg={selectedOrg} onChange={(orgId) => { setSelectedOrgState(orgId); setSelectedOrg(orgId); }} />
      </div>

      {/* 在职教师 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">在职教师 ({activeTeachers.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTeachers.map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
        {activeTeachers.length === 0 && (
          <p className="text-gray-500 text-center py-8">暂无在职教师</p>
        )}
      </div>

      {/* 离职教师 */}
      {inactiveTeachers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-400 mb-3">离职教师 ({inactiveTeachers.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {inactiveTeachers.map(teacher => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingTeacher ? '编辑教师' : '添加教师'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">可授科目（逗号分隔）</label>
                <input
                  type="text"
                  value={formData.subjects}
                  onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                  placeholder="例如: 英语, 数学, 物理"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">时薪（₱/小时）</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">在职</option>
                  <option value="inactive">离职</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherCard({ teacher, onEdit, onDelete }) {
  const [shareUrl, setShareUrl] = useState(null);
  const API_BASE = 'https://sunnybridge-crm-api.xiwanqin03.workers.dev/api/v1';

  const handleGenerateShareLink = async () => {
    try {
      const res = await fetch(`${API_BASE}/teacher/share/${teacher.id}/generate-token`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.data?.token) {
        const url = `${window.location.origin}/teacher/share/${data.data.token}`;
        setShareUrl(url);
        navigator.clipboard.writeText(url);
        alert('分享链接已复制到剪贴板！\n\n链接：' + url);
      }
    } catch (err) {
      alert('生成失败：' + err.message);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">{teacher.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {teacher.status === 'active' ? '在职' : '离职'}
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {/* 分享链接按钮 */}
          <button
            onClick={handleGenerateShareLink}
            className="p-1 hover:bg-green-100 rounded"
            title="生成分享链接"
          >
            <Share2 className="w-4 h-4 text-green-500" />
          </button>
          
          {/* 教师门户链接 */}
          <Link
            to={`/teacher/${teacher.id}`}
            className="p-1 hover:bg-purple-100 rounded"
            title="教师门户"
          >
            <ExternalLink className="w-4 h-4 text-purple-500" />
          </Link>
          
          {/* 编辑按钮 */}
          <button
            onClick={() => onEdit(teacher)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </button>
          
          {/* 删除按钮 */}
          <button
            onClick={() => onDelete(teacher.id)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {teacher.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{teacher.phone}</span>
          </div>
        )}
        {teacher.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>{teacher.email}</span>
          </div>
        )}
        {teacher.subjects?.length > 0 && (
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>{teacher.subjects.join(', ')}</span>
          </div>
        )}
        {teacher.hourly_rate && (
          <div className="text-green-600 font-medium">
            ₱{teacher.hourly_rate}/小时
          </div>
        )}
      </div>

      {teacher.notes && (
        <p className="mt-2 text-sm text-gray-500 truncate">{teacher.notes}</p>
      )}
    </div>
  );
}
