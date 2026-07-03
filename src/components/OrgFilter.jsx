import { useState, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { organizationOps } from '../store/api';

/**
 * 机构筛选下拉组件
 * 超级管理员可以看到并选择机构；普通用户隐藏。
 * 
 * Props:
 * - selectedOrg: 当前选中的机构 ID（string）
 * - onChange: 机构变化回调 (orgId: string) => void
 * - className: 额外样式
 */
export default function OrgFilter({ selectedOrg, onChange, className = '' }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const data = await organizationOps.getAll();
      setOrgs(data);
    } catch (e) {
      console.error('获取机构列表失败:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (orgs.length <= 1) return null; // 只有一个机构时不需要筛选

  return (
    <div className={`relative ${className}`}>
      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <select
        value={selectedOrg}
        onChange={e => onChange(e.target.value)}
        className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
      >
        <option value="">全部机构</option>
        {orgs.map(org => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
