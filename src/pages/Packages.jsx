import { useState, useEffect } from 'react';
import { Package, Plus, User, Calendar, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { packageOps, studentOps, loadData } from '../store';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    total: 20,
    price: '',
    expiryDate: '',
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const [pkgs, studs] = await Promise.all([
        packageOps.getAll(),
        studentOps.getAll()
      ]);
      console.log('Packages data:', pkgs);
      console.log('Students data:', studs);
      setPackages(Array.isArray(pkgs) ? pkgs : []);
      setStudents(Array.isArray(studs) ? studs : []);
    } catch (err) {
      console.error('Load error:', err);
      setPackages([]);
      setStudents([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await packageOps.add({ ...formData, used: 0 });
    setShowModal(false);
    setFormData({ studentId: '', name: '', total: 20, price: '', expiryDate: '' });
    loadPackages();
  };

  const handleDelete = async (id) => {
    if (confirm('确定要删除该课时包吗？')) {
      await packageOps.delete(id);
      loadPackages();
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || '未知学生';
  };

  const filteredPackages = packages.filter(pkg => {
    const studentName = getStudentName(pkg.studentId).toLowerCase();
    return studentName.includes(searchTerm.toLowerCase()) ||
      pkg.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalRemaining = packages.reduce((sum, p) => sum + (p.remaining || 0), 0);
  const totalValue = packages.reduce((sum, p) => sum + (p.price || 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">课时包管理</h1>
          <p className="text-gray-500 mt-1">共 {packages.length} 个课时包</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          <Plus size={20} />
          添加课时包
        </button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-primary-600">{packages.length}</div>
          <div className="text-sm text-gray-500 mt-1">课时包总数</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-green-600">{totalRemaining}</div>
          <div className="text-sm text-gray-500 mt-1">剩余总课时</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-gray-800">¥{totalValue.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">课时包总价值</div>
        </div>
      </div>

      {/* 搜索 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索学生或课时包名称..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* 课时包列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredPackages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredPackages.map(pkg => (
              <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link
                      to={`/students/${pkg.studentId}`}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600"
                    >
                      <User size={14} />
                      {getStudentName(pkg.studentId)}
                    </Link>
                    <h3 className="font-semibold text-gray-800 mt-1">{pkg.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">进度</span>
                    <span className={pkg.remaining < 5 ? 'text-red-500 font-medium' : 'text-gray-700'}>
                      {pkg.remaining}/{pkg.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        pkg.remaining < 5 ? 'bg-red-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.max((pkg.remaining / pkg.total) * 100, 0)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  {pkg.price && (
                    <span className="text-gray-500">¥{pkg.price}</span>
                  )}
                  {pkg.expiryDate && (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {pkg.expiryDate}
                    </span>
                  )}
                </div>

                {pkg.remaining < 5 && pkg.remaining > 0 && (
                  <div className="mt-3 px-2 py-1 bg-red-50 text-red-600 text-xs rounded">
                    课时不足，请提醒续费
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{searchTerm ? '未找到匹配的课时包' : '暂无课时包'}</p>
          </div>
        )}
      </div>

      {/* 添加弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">添加课时包</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 *</label>
                <select
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">选择学生</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课时包名称 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="如：60节口语课"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">总课时 *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">价格</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="¥"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">到期日期</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}