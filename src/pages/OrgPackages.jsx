import { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle, Eye, DollarSign } from 'lucide-react';
import { request, organizationOps } from '../store/api';

export default function OrgPackages() {
  const [packages, setPackages] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [filterOrg, setFilterOrg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null);
  const [showAllocModal, setShowAllocModal] = useState(null);
  const [createForm, setCreateForm] = useState({ org_id: '', total_hours: '', unit_price_cny: '80', notes: '' });
  const [payForm, setPayForm] = useState({ paid_amount_cny: '', payment_ref: '' });

  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { loadPackages(); }, [filterOrg]);

  const loadOrgs = async () => {
    try {
      const data = await organizationOps.getAll();
      setOrgs(data || []);
    } catch (e) { console.error(e); }
  };

  const loadPackages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterOrg) params.set('org_id', filterOrg);
      const res = await request(`/org-packages?${params.toString()}`);
      setPackages(res.data?.data || []);
    } catch (e) {
      console.error('加载课时包失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await request('/org-packages', {
        method: 'POST',
        body: {
          org_id: parseInt(createForm.org_id),
          total_hours: parseFloat(createForm.total_hours),
          unit_price_cny: parseFloat(createForm.unit_price_cny),
          notes: createForm.notes,
        },
      });
      alert('✅ 课时包已创建');
      setShowCreateModal(false);
      setCreateForm({ org_id: '', total_hours: '', unit_price_cny: '80', notes: '' });
      loadPackages();
    } catch (e) {
      alert('创建失败: ' + e.message);
    }
  };

  const handlePay = async () => {
    try {
      await request(`/org-packages/${showPayModal}/pay`, {
        method: 'POST',
        body: {
          paid_amount_cny: parseFloat(payForm.paid_amount_cny),
          payment_ref: payForm.payment_ref,
        },
      });
      alert('✅ 收款已记录');
      setShowPayModal(null);
      setPayForm({ paid_amount_cny: '', payment_ref: '' });
      loadPackages();
    } catch (e) {
      alert('收款失败: ' + e.message);
    }
  };

  const loadAllocations = async (id) => {
    try {
      const res = await request(`/org-packages/${id}`);
      setShowAllocModal(res.data);
    } catch (e) {
      alert('加载失败: ' + e.message);
    }
  };

  const totalHours = packages.reduce((s, p) => s + (p.total_hours || 0), 0);
  const usedHours = packages.reduce((s, p) => s + (p.used_hours || 0), 0);
  const remainHours = totalHours - usedHours;

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-orange-100 text-orange-700',
      partial_paid: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
    };
    const labels = { pending: '待付款', partial_paid: '部分付款', paid: '已付清' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="text-primary-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-800">机构课时包</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          新建课时包
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500">总课时</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalHours}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500">已用课时</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{usedHours}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500">可用课时</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{remainHours}</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterOrg}
          onChange={(e) => setFilterOrg(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
        >
          <option value="">全部机构</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">机构</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">总课时</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">已用</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">可用</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">单价</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">金额</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">已付</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="9" className="text-center py-8 text-gray-400">加载中...</td></tr>
            ) : packages.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-8 text-gray-400">暂无课时包</td></tr>
            ) : packages.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{p.org_name}</td>
                <td className="px-4 py-3 text-sm text-center">{p.total_hours}</td>
                <td className="px-4 py-3 text-sm text-center text-orange-600">{p.used_hours}</td>
                <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{p.remaining_hours}</td>
                <td className="px-4 py-3 text-sm text-center">¥{p.unit_price_cny}</td>
                <td className="px-4 py-3 text-sm text-center font-medium">¥{p.amount_cny?.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-center">¥{p.paid_amount_cny?.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => loadAllocations(p.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="查看分配">
                      <Eye size={16} />
                    </button>
                    {p.status !== 'paid' && (
                      <button onClick={() => setShowPayModal(p.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="标记收款">
                        <DollarSign size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 创建课时包 Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[440px]">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={22} className="text-primary-600" />
              <h2 className="text-lg font-bold">新建课时包</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">选择机构</label>
                <select
                  value={createForm.org_id}
                  onChange={(e) => setCreateForm({ ...createForm, org_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">请选择</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">总课时</label>
                  <input type="number" value={createForm.total_hours}
                    onChange={(e) => setCreateForm({ ...createForm, total_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="如 50" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">单价（¥）</label>
                  <input type="number" value={createForm.unit_price_cny}
                    onChange={(e) => setCreateForm({ ...createForm, unit_price_cny: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="如 80" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">备注</label>
                <textarea value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows="2" />
              </div>
              {createForm.total_hours && createForm.unit_price_cny && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-center">
                  预计总额: <span className="font-bold text-primary-600">¥{(parseFloat(createForm.total_hours || 0) * parseFloat(createForm.unit_price_cny || 0)).toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleCreate} disabled={!createForm.org_id || !createForm.total_hours}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 标记收款 Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={22} className="text-green-600" />
              <h2 className="text-lg font-bold">标记收款</h2>
            </div>
            <input type="number" value={payForm.paid_amount_cny}
              onChange={(e) => setPayForm({ ...payForm, paid_amount_cny: e.target.value })}
              placeholder="收款金额（¥）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" />
            <input type="text" value={payForm.payment_ref}
              onChange={(e) => setPayForm({ ...payForm, payment_ref: e.target.value })}
              placeholder="付款凭证号（可选）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setShowPayModal(null); setPayForm({ paid_amount_cny: '', payment_ref: '' }); }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                取消
              </button>
              <button onClick={handlePay} disabled={!payForm.paid_amount_cny}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                确认收款
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分配明细 Modal */}
      {showAllocModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">课时包 #{showAllocModal.id} — 分配明细</h2>
              <button onClick={() => setShowAllocModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
              <div><span className="text-gray-500">机构:</span> {showAllocModal.org_name}</div>
              <div><span className="text-gray-500">总/已用:</span> {showAllocModal.total_hours}/{showAllocModal.used_hours}</div>
              <div><span className="text-gray-500">剩余:</span> {showAllocModal.remaining_hours}</div>
              <div><span className="text-gray-500">状态:</span> {statusBadge(showAllocModal.status)}</div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">学生</th>
                  <th className="px-3 py-2 text-center">课时变动</th>
                  <th className="px-3 py-2 text-left">备注</th>
                  <th className="px-3 py-2 text-center">日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(showAllocModal.allocations || []).map(a => (
                  <tr key={a.id}>
                    <td className="px-3 py-2">{a.student_name || `#${a.student_id}`}</td>
                    <td className="px-3 py-2 text-center font-medium">
                      <span className={a.hours > 0 ? 'text-green-600' : 'text-red-600'}>
                        {a.hours > 0 ? '+' : ''}{a.hours}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{a.notes}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{a.created_at}</td>
                  </tr>
                ))}
                {(showAllocModal.allocations || []).length === 0 && (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-400">暂无分配记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
