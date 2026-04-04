import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { packageOps } from '../store/api';

/**
 * 调整课时弹窗组件
 * @param {Object} props
 * @param {Object} props.packageInfo - 课时包信息
 * @param {Function} props.onClose - 关闭回调
 * @param {Function} props.onSuccess - 成功回调
 */
export default function AdjustHoursModal({ packageInfo, onClose, onSuccess }) {
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 快捷调整选项
  const quickAdjustments = [
    { label: '+1', value: 1 },
    { label: '+5', value: 5 },
    { label: '+10', value: 10 },
    { label: '-1', value: -1 },
    { label: '-5', value: -5 },
  ];

  // 常用原因
  const commonReasons = [
    '赠送课时',
    '系统调整',
    '补偿课时',
    '测试调整',
    '其他',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (adjustment === 0) {
      setError('请选择调整数量');
      return;
    }

    if (!reason.trim()) {
      setError('请填写调整原因');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await packageOps.adjust(packageInfo.id, adjustment, reason, notes);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || '调整失败');
    } finally {
      setLoading(false);
    }
  };

  const newTotal = (packageInfo?.total || 0) + adjustment;
  const newRemaining = (packageInfo?.remaining || 0) + adjustment;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">调整课时</h2>

        {/* 当前课时包信息 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-500 mb-1">课时包</div>
          <div className="font-medium text-gray-800">{packageInfo?.name || `套餐 #${packageInfo?.id}`}</div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div className="text-xs text-gray-400">总课时</div>
              <div className="text-lg font-bold text-gray-800">{packageInfo?.total || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">剩余</div>
              <div className="text-lg font-bold text-primary-600">{packageInfo?.remaining || 0}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 快捷调整 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">快捷调整</label>
            <div className="flex gap-2">
              {quickAdjustments.map((qa) => (
                <button
                  key={qa.value}
                  type="button"
                  onClick={() => setAdjustment(adjustment + qa.value)}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    qa.value > 0
                      ? 'border-green-200 text-green-600 hover:bg-green-50'
                      : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

          {/* 调整数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              调整数量（正数为增加，负数为减少）*
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdjustment(adjustment - 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Minus size={20} className="text-gray-600" />
              </button>
              <input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setAdjustment(adjustment + 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Plus size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* 调整后预览 */}
          {adjustment !== 0 && (
            <div className={`p-3 rounded-lg ${adjustment > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm">
                <span className="text-gray-600">调整后：</span>
                <span className={`font-bold ${adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {adjustment > 0 ? '+' : ''}{adjustment} 节
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                总课时: {packageInfo?.total || 0} → {newTotal} | 剩余: {packageInfo?.remaining || 0} → {newRemaining}
              </div>
            </div>
          )}

          {/* 调整原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">调整原因 *</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {commonReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    reason === r
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="请选择或输入调整原因"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="补充说明"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 text-white rounded-lg ${
                adjustment >= 0
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              disabled={loading}
            >
              {loading ? '处理中...' : '确认调整'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
