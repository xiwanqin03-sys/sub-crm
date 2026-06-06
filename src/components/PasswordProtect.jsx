import { useState } from 'react';
import { Lock } from 'lucide-react';

const PASSWORD = 'sunnybridge2024'; // 可以修改为你想要的密码

export default function PasswordProtect({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('crm_authenticated') === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('crm_authenticated', 'true');
      setError('');
    } else {
      setError('密码错误，请重试');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">阳光桥 CRM</h1>
          <p className="text-gray-500 mt-2">请输入密码访问系统</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            进入系统
          </button>
        </form>
      </div>
    </div>
  );
}
