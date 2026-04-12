import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Calendar, CreditCard, Clock, Plus, Trash2, AlertTriangle, MessageSquare } from 'lucide-react';
import { studentOps, packageOps, classOps, paymentOps } from '../store';
import AdjustHoursModal from '../components/AdjustHoursModal';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [packages, setPackages] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showClassModal, setShowClassModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classForm, setClassForm] = useState({ date: '', hours: 1, notes: '' });

  useEffect(() => {
    async function loadStudentData() {
      if (id) {
        setLoading(true);
        try {
          const s = await studentOps.getById(id);
          if (s) {
            setStudent(s);
            const [packagesData, classesData, paymentsData] = await Promise.all([
              packageOps.getByStudent(id),
              classOps.getByStudent(id),
              paymentOps.getByStudent(id)
            ]);
            setPackages(Array.isArray(packagesData) ? packagesData : []);
            setClasses(Array.isArray(classesData) ? classesData : []);
            setPayments(Array.isArray(paymentsData) ? paymentsData : []);
          }
        } catch (err) {
          console.error('Load student error:', err);
        } finally {
          setLoading(false);
        }
      }
    }
    loadStudentData();
  }, [id]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    const hoursToConsume = classForm.hours || 1;
    const totalRemaining = student ? (student.total_hours ?? student.package_summary?.total_hours ?? 0) - (student.used_hours ?? student.package_summary?.used_hours ?? 0) : 0;
    if (totalRemaining < hoursToConsume) {
      alert(`课时不足！当前剩余 ${totalRemaining} 节，需要 ${hoursToConsume} 节。请先购买课时。`);
      return;
    }
    try {
      // 直接添加课程，不再需要 packageId
      await classOps.add(id, { ...classForm, studentId: id, hours: hoursToConsume });
      setShowClassModal(false);
      setClassForm({ date: '', hours: 1, notes: '' });
      const [packagesData, classesData] = await Promise.all([
        packageOps.getByStudent(id),
        classOps.getByStudent(id)
      ]);
      setPackages(Array.isArray(packagesData) ? packagesData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (err) {
      alert('添加失败：' + err.message);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (confirm('确定要删除该上课记录吗？')) {
      try {
        await classOps.delete(classId);
        const [packagesData, classesData] = await Promise.all([
          packageOps.getByStudent(id),
          classOps.getByStudent(id)
        ]);
        setPackages(Array.isArray(packagesData) ? packagesData : []);
        setClasses(Array.isArray(classesData) ? classesData : []);
      } catch (err) {
        alert('删除失败：' + err.message);
      }
    }
  };

  const handleAdjustSuccess = async () => {
    loadStudent();
  };

  const totalRemaining = student ? (student.total_hours ?? student.package_summary?.total_hours ?? 0) - (student.used_hours ?? student.package_summary?.used_hours ?? 0) : 0;
  const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 获取第一个活跃的课时包（用于调整）
  const activePackage = packages.find(p => p.remaining > 0) || packages[0];

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">学生不存在</p>
          <Link to="/students" className="text-primary-600 hover:underline mt-2 inline-block">
            返回学生列表
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'classes', label: '上课记录' },
    { id: 'payments', label: '付款记录' },
  ];

  const STATUS_LABELS = {
    completed: '已完成',
    scheduled: '已排课',
    cancelled: '已取消',
    absent: '缺席'
  };

  const STATUS_COLORS = {
    completed: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-700',
    absent: 'bg-red-100 text-red-700'
  };

  return (
    <div className="p-8">
      <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
        <ArrowLeft size={20} />
        返回学生列表
      </button>

      {/* 学生基本信息 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-primary-700 font-bold">
                {student.name?.charAt(0) || '学'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{student.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-500">
                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={16} />
                    {student.phone}
                  </span>
                )}
                {student.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={16} />
                    {student.email}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                {student.grade && <span>年级: {student.grade}</span>}
                {student.age && <span>年龄: {student.age}</span>}
                {student.parentName && <span>家长: {student.parentName}</span>}
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            student.status === 'active' ? 'bg-green-100 text-green-700' :
            student.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {student.status === 'active' ? '学习中' : student.status === 'inactive' ? '已暂停' : '已结课'}
          </span>
        </div>

        {/* 课时不足警告 */}
        {totalRemaining > 0 && totalRemaining < 5 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">课时不足！剩余 {totalRemaining} 节，请提醒家长续费</span>
          </div>
        )}
        {totalRemaining === 0 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 text-red-800">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">课时已用完，请立即购买新课时</span>
          </div>
        )}

        {/* 快速统计 */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{totalRemaining}</div>
            <div className="text-sm text-gray-500">剩余课时</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{classes.length}</div>
            <div className="text-sm text-gray-500">上课次数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">¥{totalSpent.toLocaleString()}</div>
            <div className="text-sm text-gray-500">累计消费</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{payments.length}</div>
            <div className="text-sm text-gray-500">付款次数</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 概览 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 课时余额概览 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">课时余额</h3>
              {student && (
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  调整课时
                </button>
              )}
            </div>
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-primary-600">{totalRemaining}</div>
              <div className="text-sm text-gray-500 mt-1">剩余课时</div>
            </div>
            {/* 课时包列表 */}
            {packages.length > 0 && (
              <div className="mt-4 space-y-2">
                {packages.map(pkg => (
                  <div key={pkg.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="text-gray-600">{pkg.name || `套餐 #${pkg.id}`}</span>
                    <span className="font-medium text-primary-600">{pkg.remaining}/{pkg.total}</span>
                  </div>
                ))}
              </div>
            )}
            {totalRemaining < 5 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                课时不足，请提醒家长续费
              </div>
            )}
          </div>

          {/* 最近上课记录 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">最近上课</h3>
              <button onClick={() => setShowClassModal(true)} className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1">
                <Plus size={16} />
                添加
              </button>
            </div>
            {classes.length > 0 ? (
              <div className="space-y-3">
                {classes.slice(0, 3).map(cls => (
                  <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-800">{cls.date}</div>
                        <div className="text-sm text-gray-500">
                          {cls.hours} 节
                          {cls.status && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[cls.status]}`}>
                              {STATUS_LABELS[cls.status]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {(cls.content || cls.homework) && (
                      <button onClick={() => setShowFeedbackModal(cls)} className="text-primary-600 hover:text-primary-700" title="查看反馈">
                        <MessageSquare size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">暂无上课记录</p>
            )}
          </div>
        </div>
      )}

      {/* 上课记录 */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">上课记录</h3>
            <button onClick={() => setShowClassModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
              <Plus size={18} />
              记录上课
            </button>
          </div>
          {classes.length > 0 ? (
            <div className="space-y-3">
              {classes.map(cls => (
                <div key={cls.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{cls.date}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        {cls.hours} 节
                        {cls.status && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[cls.status]}`}>
                            {STATUS_LABELS[cls.status]}
                          </span>
                        )}
                        {cls.content && <span className="text-primary-600">· 有反馈</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(cls.content || cls.homework) && (
                      <button onClick={() => setShowFeedbackModal(cls)} className="p-2 text-primary-600 hover:text-primary-700" title="查看反馈">
                        <MessageSquare size={18} />
                      </button>
                    )}
                    <button onClick={() => handleDeleteClass(cls.id)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无上课记录</p>
            </div>
          )}
        </div>
      )}

      {/* 付款记录 */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-6">付款记录</h3>
          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{payment.date}</div>
                      <div className="text-sm text-gray-500">
                        {payment.payment_method || payment.method || '微信支付'}
                        {payment.description && ` · ${payment.description}`}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${payment.amount > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {payment.amount > 0 ? '+' : ''}¥{payment.amount?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无付款记录</p>
            </div>
          )}
        </div>
      )}

      {/* 添加上课记录弹窗 */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">记录上课</h2>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上课日期 *</label>
                <input
                  type="date"
                  required
                  value={classForm.date}
                  onChange={(e) => setClassForm({ ...classForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">消耗课时 *</label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={classForm.hours}
                  onChange={(e) => setClassForm({ ...classForm, hours: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={classForm.notes}
                  onChange={(e) => setClassForm({ ...classForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="如：口语课、阅读课"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowClassModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 反馈详情弹窗 */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">上课反馈详情</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">学生：</span>
                  <span className="font-medium text-gray-800">{student.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">日期：</span>
                  <span className="font-medium text-gray-800">{showFeedbackModal.date}</span>
                </div>
                <div>
                  <span className="text-gray-500">课时：</span>
                  <span className="font-medium text-gray-800">{showFeedbackModal.hours} 节</span>
                </div>
                <div>
                  <span className="text-gray-500">状态：</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[showFeedbackModal.status]}`}>
                    {STATUS_LABELS[showFeedbackModal.status]}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {showFeedbackModal.content && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">上课内容</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                    {showFeedbackModal.content}
                  </div>
                </div>
              )}
              {showFeedbackModal.homework && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">作业布置</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                    {showFeedbackModal.homework}
                  </div>
                </div>
              )}
              {showFeedbackModal.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">备注</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap">
                    {showFeedbackModal.notes}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowFeedbackModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 调整课时弹窗 */}
      {showAdjustModal && student && (
        <AdjustHoursModal
          studentInfo={student}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={handleAdjustSuccess}
        />
      )}
    </div>
  );
}
