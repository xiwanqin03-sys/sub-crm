import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Clock, DollarSign, User, Search } from 'lucide-react';
import { courseOps, teacherOps } from '../store';

const LEVEL_LABELS = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
  all: '全部等级'
};

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    level: 'all',
    duration: '60',
    price: '',
    description: '',
    teacher_id: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesData, teachersData] = await Promise.all([
        courseOps.getAll(),
        teacherOps.getAll()
      ]);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData.filter(t => t.status === 'active') : []);
    } catch (err) {
      console.error('Load error:', err);
      setCourses([]);
      setTeachers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const courseData = {
        ...formData,
        duration: parseInt(formData.duration) || 60,
        price: formData.price ? parseFloat(formData.price) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null
      };

      if (editingCourse) {
        await courseOps.update(editingCourse.id, courseData);
      } else {
        await courseOps.add(courseData);
      }

      setShowModal(false);
      setEditingCourse(null);
      setFormData({ name: '', subject: '', level: 'all', duration: '60', price: '', description: '', teacher_id: '', status: 'active' });
      loadData();
    } catch (err) {
      alert('保存失败：' + err.message);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      subject: course.subject || '',
      level: course.level || 'all',
      duration: course.duration?.toString() || '60',
      price: course.price?.toString() || '',
      description: course.description || '',
      teacher_id: course.teacher_id?.toString() || '',
      status: course.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个课程吗？')) return;
    try {
      await courseOps.delete(id);
      loadData();
    } catch (err) {
      alert('删除失败：' + err.message);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCourses = filteredCourses.filter(c => c.status === 'active');
  const inactiveCourses = filteredCourses.filter(c => c.status === 'inactive');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">课程管理</h1>
        <button
          onClick={() => {
            setEditingCourse(null);
            setFormData({ name: '', subject: '', level: 'all', duration: '60', price: '', description: '', teacher_id: '', status: 'active' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          添加课程
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="搜索课程名称、科目、教师..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* 启用的课程 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">启用课程 ({activeCourses.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCourses.map(course => (
            <CourseCard key={course.id} course={course} teachers={teachers} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
        {activeCourses.length === 0 && (
          <p className="text-gray-500 text-center py-8">暂无启用的课程</p>
        )}
      </div>

      {/* 停用的课程 */}
      {inactiveCourses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-400 mb-3">停用课程 ({inactiveCourses.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {inactiveCourses.map(course => (
              <CourseCard key={course.id} course={course} teachers={teachers} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingCourse ? '编辑课程' : '添加课程'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 少儿英语启蒙班"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">科目</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="例如: 英语"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">难度等级</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="beginner">初级</option>
                  <option value="intermediate">中级</option>
                  <option value="advanced">高级</option>
                  <option value="all">全部等级</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程时长（分钟）</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">单价（元）</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">授课教师</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">不指定</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
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
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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

function CourseCard({ course, teachers, onEdit, onDelete }) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold">{course.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              course.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {course.status === 'active' ? '启用' : '停用'}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(course)} className="p-1 hover:bg-gray-100 rounded">
            <Edit2 className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => onDelete(course.id)} className="p-1 hover:bg-gray-100 rounded">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {course.subject && (
          <div className="inline-block bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">
            {course.subject}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.duration || 60}分钟</span>
          </div>
          {course.price && (
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <DollarSign className="w-4 h-4" />
              <span>¥{course.price}</span>
            </div>
          )}
        </div>
        {course.teacher_name && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{course.teacher_name}</span>
          </div>
        )}
        <div className="text-xs text-gray-400">
          等级: {LEVEL_LABELS[course.level] || course.level}
        </div>
      </div>

      {course.description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{course.description}</p>
      )}
    </div>
  );
}
