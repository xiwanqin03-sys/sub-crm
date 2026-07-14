import { useState, useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle, XCircle, Plus, RefreshCw, Trash2, CreditCard, Edit2, ChevronDown, ChevronUp, Filter, Clock } from 'lucide-react';
import { teacherOps, teacherPaymentOps } from '../store';


export default function TeacherPayments() {
  const [payments, setPayments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState('gcash');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRateTeacher, setEditingRateTeacher] = useState(null);
  const [rateValue, setRateValue] = useState('');
  const [rateValue25, setRateValue25] = useState('');
  const [showRateSection, setShowRateSection] = useState(false);
  
  // 筛选状态
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [formData, setFormData] = useState({
    teacher_id: '',
    period_start: '',
    period_end: '',
    notes: ''
  });

  useEffect(() => {
    loadPayments();
    loadTeachers();
  }, []);

  const loadPayments = async () => {
    try {
      const data = await teacherPaymentOps.getAll();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载薪资记录失败:', err);
    }
  };

  const loadTeachers = async () => {
    try {
      const data = await teacherOps.getAll();
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载教师列表失败:', err);
    }
  };

  const handleEditRate = (teacher) => {
    setEditingRateTeacher(teacher);
    setRateValue(teacher.hourly_rate || '');
    setRateValue25(teacher.hourly_rate_25 !== undefined && teacher.hourly_rate_25 !== null ? teacher.hourly_rate_25 : '80');
    setShowRateModal(true);
  };

  const handleSaveRate = async () => {
    if (!editingRateTeacher) return;
    try {
      await teacherOps.update(editingRateTeacher.id, {
        ...editingRateTeacher,
        hourly_rate: rateValue ? parseFloat(rateValue) : null,
        hourly_rate_25: rateValue25 ? parseFloat(rateValue25) : null
      });
      setShowRateModal(false);
      loadTeachers();
    } catch (err) {
      alert('保存失败：' + err.message);
    }
  };

  // 统计数据
  const getFilteredPayments = () => {
    return payments.filter(p => {
      if (filterTeacher && p.teacher_id !== parseInt(filterTeacher)) return false;
      if (filterMonth && !p.period_start.startsWith(filterMonth)) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  };

  const filteredPayments = getFilteredPayments();

  const stats = {
    pending: payments.filter(p => p.status === 'pending'),
    paidThisMonth: payments.filter(p => {
      if (p.status !== 'paid') return false;
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return p.period_start.startsWith(currentMonth);
    }),
    total: payments
  };

  const getThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const getLastWeek = () => {
    const { start, end } = getThisWeek();
    const lastStart = new Date(start);
    lastStart.setDate(lastStart.getDate() - 7);
    const lastEnd = new Date(end);
    lastEnd.setDate(lastEnd.getDate() - 7);
    return {
      start: lastStart.toISOString().split('T')[0],
      end: lastEnd.toISOString().split('T')[0]
    };
  };

  // 选择教师后自动填充开始日期
  const handleTeacherChange = (teacherId) => {
    let periodStart = '';
    
    if (teacherId) {
      const teacherPayments = payments.filter(p => p.teacher_id === parseInt(teacherId));
      if (teacherPayments.length > 0) {
        const lastPayment = teacherPayments.sort((a, b) => 
          new Date(b.period_end) - new Date(a.period_end)
        )[0];
        const lastEnd = lastPayment.period_end;
        const nextDay = new Date(lastEnd);
        nextDay.setDate(nextDay.getDate() + 1);
        periodStart = nextDay.toISOString().split('T')[0];
      }
    }
    
    setFormData(prev => ({
      ...prev,
      teacher_id: teacherId,
      period_start: periodStart
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await teacherPaymentOps.create(formData);
      const c50 = result.count_50min || 0;
      const c25 = result.count_25min || 0;
      const r50 = result.rate_50min || result.hourly_rate || 0;
      const r25 = result.rate_25min || 0;
      alert(`结算创建成功！\n50分钟课: ${c50}节 × ₱${r50} + 25分钟课: ${c25}节 × ₱${r25} = ₱${result.total_amount}`);
      setShowModal(false);
      loadPayments();
      setFormData({ teacher_id: '', period_start: '', period_end: '', notes: '' });
    } catch (err) {
      alert('创建失败: ' + err.message);
    }
    setLoading(false);
  };

  const handlePay = async (id) => {
    setPayingId(id);
    setPayMethod('gcash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setShowPayModal(true);
  };

  const confirmPay = async () => {
    if (!payingId) return;
    try {
      await teacherPaymentOps.markPaid(payingId, { payment_method: payMethod, paid_at: payDate });
      setShowPayModal(false);
      loadPayments();
    } catch (err) {
      alert('操作失败: ' + err.message);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('确认取消此结算？')) return;
    try {
      await teacherPaymentOps.cancel(id);
      loadPayments();
    } catch (err) {
      alert('操作失败: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除此结算记录吗？')) return;
    try {
      await teacherPaymentOps.delete(id);
      loadPayments();
    } catch (err) {
      alert('删除失败：' + err.message);
    }
  };

  const quickFillLastWeek = () => {
    const { start, end } = getLastWeek();
    setFormData(prev => ({ ...prev, period_start: start, period_end: end }));
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500'
  };

  const statusLabels = {
    pending: '待支付',
    paid: '已支付',
    cancelled: '已取消'
  };

  const paymentMethodLabels = {
    gcash: 'GCash',
    bank: '银行转账',
 cash: '现金',
    other: '其他'
  };

  const activeTeachers = teachers.filter(t => t.status === 'active');

  return (
    <div className="p-6 relative min-h-screen">
      {/* 标题 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">教师薪资结算</h1>
      </div>

      {/* 📊 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">待支付</p>
              <p className="text-2xl font-bold text-gray-800">
                ₱{stats.pending.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stats.pending.length} 笔记录</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">本月已付</p>
              <p className="text-2xl font-bold text-gray-800">
                ₱{stats.paidThisMonth.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stats.paidThisMonth.length} 笔记录</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-5 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">总计记录</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total.length}</p>
              <p className="text-xs text-gray-400 mt-1">
                ₱{stats.total.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2)} 总金额
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 筛选栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部教师</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="paid">已支付</option>
            <option value="cancelled">已取消</option>
          </select>
          <button
            onClick={() => { setFilterTeacher(''); setFilterMonth(''); setFilterStatus(''); }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            清除筛选
          </button>
        </div>
      </div>

      {/* 💳 结算记录卡片列表 */}
      <div className="space-y-4 mb-8">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
            <DollarSign size={48} className="mx-auto mb-3 text-gray-300" />
            <p>暂无薪资记录</p>
          </div>
        ) : (
          filteredPayments.map(payment => (
            <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* 第一行：教师 + 状态 */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-800">{payment.teacher_name}</h3>
                    {payment.status === 'paid' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                        已支付
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                        {statusLabels[payment.status]}
                      </span>
                    )}
                  </div>

                  {/* 第二行：周期 */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Calendar size={14} />
                    {payment.period_start} ~ {payment.period_end}
                  </div>

                  {/* 第三行：详细数据 */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      <span className="font-medium">{payment.total_classes}</span> 课时
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-600">
                      <span className="font-medium">{payment.total_hours}</span> 小时
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-600">
                      时薪 ₱<span className="font-medium">{payment.hourly_rate}</span>
                    </span>
                  </div>
                </div>

                {/* 金额 + 操作 */}
                <div className="text-right flex flex-col items-end">
                  <p className="text-xl font-bold text-green-600 mb-2">
                    ₱{payment.total_amount?.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2">
                    {payment.status === 'paid' ? (
                      <div className="text-xs text-gray-400">
                        <div>{payment.paid_at?.split(' ')[0]}</div>
                        {payment.payment_method && (
                          <div>{paymentMethodLabels[payment.payment_method]}</div>
                        )}
                      </div>
                    ) : payment.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handlePay(payment.id)}
                          className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 font-medium"
                        >
                          支付
                        </button>
                        <button
                          onClick={() => handleCancel(payment.id)}
                          className="px-3 py-1.5 text-gray-400 hover:text-red-600 rounded-lg text-sm"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ⚙️ 教师时薪设置（底部折叠区域） */}
      <div className="border-t border-gray-200 pt-6">
        <button
          onClick={() => setShowRateSection(!showRateSection)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          {showRateSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>教师时薪设置</span>
        </button>
        
        {showRateSection && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeTeachers.map(teacher => (
                <div key={teacher.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{teacher.name}</span>
                    <div className={`text-xs ${teacher.hourly_rate ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {teacher.hourly_rate ? `50min: ₱${teacher.hourly_rate}/节` : '未设置'}
                      {teacher.hourly_rate_25 ? ` · 25min: ₱${teacher.hourly_rate_25}/节` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditRate(teacher)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="编辑时薪"
                  >
                    <Edit2 size={14} className="text-gray-500" />
                  </button>
                </div>
              ))}
              {activeTeachers.length === 0 && (
                <p className="text-gray-400 text-sm col-span-full">暂无在职教师</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🔘 浮动按钮 */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-transform hover:scale-105 z-40"
        title="新建结算"
      >
        <Plus size={24} />
      </button>

      {/* 新建结算弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">新建薪资结算</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教师</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  required
                >
                  <option value="">选择教师</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    required
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={quickFillLastWeek}
                className="text-sm text-primary-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw size={14} />
                快速填入上周
              </button>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="可选"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  {loading ? '计算中...' : '创建结算'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 支付确认弹窗 */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              确认支付
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支付方式</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="gcash">GCash</option>
                  <option value="bank">银行转账</option>
                  <option value="cash">现金</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支付日期</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmPay}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  确认已支付
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑时薪弹窗 */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">编辑教师结算单价</h2>
            <p className="text-gray-600 mb-4">教师：<span className="font-medium">{editingRateTeacher?.name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">50分钟课单价（₱/节）</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  placeholder="如 150"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">25分钟课单价（₱/节）</label>
                <input
                  type="number"
                  step="0.01"
                  value={rateValue25}
                  onChange={(e) => setRateValue25(e.target.value)}
                  placeholder="如 80"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400 mt-1">结算 = 50分钟次数 × 50分钟单价 + 25分钟次数 × 25分钟单价</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowRateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveRate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
