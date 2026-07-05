import { useState, useEffect } from 'react';
import { useParams, useNavigate, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Building2, Users, Calendar, Clock, LogOut, LayoutDashboard } from 'lucide-react';
import { getOrgSession, clearOrgSession, setSelectedOrg } from '../store/api';
import Students from './Students';
import Schedule from './Schedule';
import Classes from './Classes';

// Wrapper：锁定机构 ID
function withOrgLock(WrappedComponent) {
  return function OrgWrapped(props) {
    const { orgId } = useParams();
    useEffect(() => {
      setSelectedOrg(orgId);
    }, [orgId]);

    return <WrappedComponent {...props} forceOrgId={orgId} />;
  };
}

const OrgStudents = withOrgLock(Students);
const OrgSchedule = withOrgLock(Schedule);
const OrgClasses = withOrgLock(Classes);

export default function OrgPortal() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(getOrgSession());

  // 检查登录状态
  useEffect(() => {
    const s = getOrgSession();
    if (!s.token || String(s.orgId) !== String(orgId)) {
      navigate('/org-login');
    } else {
      setSession(s);
      // 锁定本机构数据
      setSelectedOrg(String(orgId));
    }
  }, [orgId]);

  const handleLogout = () => {
    clearOrgSession();
    navigate('/org-login');
  };

  if (!session.token) {
    return <div className="p-8 text-center text-gray-500">跳转中...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-sm">{session.orgName}</h1>
              <p className="text-xs text-gray-400">机构管理端</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to={`/portal/${orgId}/students`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Users size={20} />
            <span>学生管理</span>
          </NavLink>
          <NavLink
            to={`/portal/${orgId}/schedule`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Calendar size={20} />
            <span>排课管理</span>
          </NavLink>
          <NavLink
            to={`/portal/${orgId}/classes`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Clock size={20} />
            <span>上课记录</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to={`/portal/${orgId}/students`} replace />} />
          <Route path="/students" element={<OrgStudents />} />
          <Route path="/schedule" element={<OrgSchedule />} />
          <Route path="/classes" element={<OrgClasses />} />
        </Routes>
      </div>
    </div>
  );
}
