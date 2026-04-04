import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Settings, Calendar, GraduationCap, CalendarDays } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Payments from './pages/Payments';
import SettingsPage from './pages/Settings';
import ParentView from './pages/ParentView';
import Classes from './pages/Classes';
import Teachers from './pages/Teachers';
import Schedule from './pages/Schedule';
import TeacherPortal from './pages/TeacherPortal';
import TeacherShare from './pages/TeacherShare';

function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">阳光桥 CRM</h1>
        <p className="text-sm text-gray-500 mt-1">在线英语客户管理</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span>仪表盘</span>
        </NavLink>

        <NavLink
          to="/students"
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
          to="/payments"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <CreditCard size={20} />
          <span>收款记录</span>
        </NavLink>

        <NavLink
          to="/classes"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <Calendar size={20} />
          <span>上课记录</span>
        </NavLink>

        <NavLink
          to="/teachers"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <GraduationCap size={20} />
          <span>教师管理</span>
        </NavLink>

        <NavLink
          to="/schedule"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <CalendarDays size={20} />
          <span>排课管理</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <Settings size={20} />
          <span>设置</span>
        </NavLink>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-400 text-center">
          © 2024 阳光桥在线英语
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/teacher/:teacherId" element={<TeacherPortal />} />
              <Route path="/teacher/share/:token" element={<TeacherShare />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/parent" element={<ParentView />} />
            <Route path="/parent/:studentId" element={<ParentView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
