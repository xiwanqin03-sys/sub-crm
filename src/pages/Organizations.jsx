import { useState, useEffect } from 'react';
import { Plus, Building2, Users, GraduationCap, CalendarDays, Phone, Mail, Search } from 'lucide-react';

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchOrgs(); }, []);

  const fetchOrgs = async () => {
    try {
      const res = await fetch('https://sunnybridge-crm-api.xiwanqin03.workers.dev/api/v1/organizations');
      const data = await res.json();
      if (data.success) setOrganizations(data.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = organizations.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6 text-gray-500">加载中...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">机构管理</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Plus size={20} /> 新增机构
        </button>
      </div>
      
      <input 
        type="text" 
        placeholder="搜索..." 
        value={searchTerm} 
        onChange={e => setSearchTerm(e.target.value)}
        className="mb-6 px-4 py-2 border rounded-lg w-80"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map(org => (
          <div key={org.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg">{org.name}</h3>
            <p className="text-sm text-gray-500">{org.contact_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
