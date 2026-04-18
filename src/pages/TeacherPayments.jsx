import { useState, useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle, XCircle, Plus, RefreshCw, Trash2, CreditCard } from 'lucide-react';

const API_BASE = 'https://sunnybridge-crm-api.xiwanqin03.workers.dev/api/v1';
const API_KEY = 'sunnybridge-dev-key-2024';

export default function TeacherPayments() {
  const [payments, setPayments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState('gcash');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
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
      const res = await fetch(`${API_BASE}/teacher-payments`, {
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await res.json();
      if (data.data) setPayments(data.data);
    } catch (err) {
      console.error('加载薪资记录失败:', err);
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/teachers`, {
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await res.json();
      const teachersList = data.data?.items || data.data?.data || data.data || [];
      setTeachers(teachersList);
    } catch (err) {
      console.error('加载教师列表失败:', err);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/teacher-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.data) {
        alert(`结算创建成功！\n课时数: ${data.data.total_classes}\n总时长: ${data.data.total_hours} 小时\n应付金额: ¥${data.data.total_amount}`);
        setShowModal(false);
        loadPayments();
        setFormData({ teacher_id: '', period_start: '', period_end: '', notes: '' });
      } else {
        alert('创建失败: ' + (data.error?.message || '未知错误'));
      }
    } catch (err) {
      alert('请求失败: ' + err.message);
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
      const res = await fetch(`${API_BASE}/teacher-payments/${payingId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ payment_method: payMethod, paid_at: payDate })
      });
      const data = await res.json();
      if (data.data) {
        setShowPayModal(false);
        loadPayments();
      }
    } catch (err) {
      alert('操作失败: ' + err.message);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('确认取消此结算？')) return;
    try {
      const res = await fetch(`${API_BASE}/teacher-payments/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await res.json();
      if (data.data) {
        loadPayments();
      }
    } catch (err) {
      alert('操作失败: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除此结算记录吗？')) return;
    try {
      const res = await fetch(`${API_BASE}/teacher-payments/${id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY }
      });
      if (res.ok) {
        loadPayments();
      } else {
        const data = await res.json();
        alert('删除失败: ' + (data.error?.message || '未知错误'));
      }
    } catch (err) {
      alert('操作失败: ' + err.message);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">教师薪资结算</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          <Plus size={20} />
          新建结算
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">教师</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">结算周期</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">课时数</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">总时长</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">时薪</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">应付金额</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">状态/支付信息</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  暂无薪资记录
                </td>
              </tr>
            ) : (
              payments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{payment.teacher_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      {payment.period_start} ~ {payment.period_end}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">{payment.total_classes}</td>
                  <td className="px-6 py-4 text-center">{payment.total_hours} 小时</td>
                  <td className="px-6 py-4 text-right">¥{payment.hourly_rate}</td>
                  <td className="px-6 py-4 text-right font-semibold text-green-600">
                    ¥{payment.total_amount?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {payment.status === 'paid' ? (
                      <div className="text-xs">
                        <div className="font-medium text-green-600">{statusLabels[payment.status]}</div>
                        <div className="text-gray-500">{payment.paid_at?.split(' ')[0]}</div>
                        {payment.payment_method && (
                          <div className="text-gray-400">{paymentMethodLabels[payment.payment_method]}</div>
                        )}
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs ${statusColors[payment.status]}`}>
                        {statusLabels[payment.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(payment.status === 'pending' || payment.status === 'cancelled') && (
                      <div className="flex justify-center gap-2">
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handlePay(payment.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="标记已支付"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleCancel(payment.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="取消"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新建结算弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">新建薪资结算</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教师</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
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
    </div>
  );
}
