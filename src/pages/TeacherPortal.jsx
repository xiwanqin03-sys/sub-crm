import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, User, BookOpen, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { teacherOps, classOps, packageOps } from '../store';

const STATUS_LABELS = {
  scheduled: '已预约',
  completed: '已完成',
  cancelled: '已取消',
  absent: '缺席'
};

const STATUS_COLORS = {
  scheduled: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  absent: 'bg-red-100 text-red-800'
};

export default function TeacherPortal() {
  const { teacherId } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [pastClasses, setPastClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    content: '',
    homework: '',
    notes: '',
    status: 'completed'
  });

  useEffect(() => {
    loadTeacherData();
  }, [teacherId]);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const teacherData = await teacherOps.getById(teacherId);
      setTeacher(teacherData);

      const allClasses = await classOps.getAll();
      const teacherClasses = allClasses.filter(c => c.teacher_id === parseInt(teacherId));

      const today = new Date().toISOString().split('T')[0];

      const todayCls = teacherClasses.filter(c => c.date === today && c.status === 'scheduled');
      const upcoming = teacherClasses.filter(c => c.date > today && c.status === 'scheduled');
      const past = teacherClasses.filter(c => c.date < today || c.status !== 'scheduled');

      todayCls.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      upcoming.sort((a, b) => a.date.localeCompare(b.date));
      past.sort((a, b) => b.date.localeCompare(a.date));

      setTodayClasses(todayCls);
      setUpcomingClasses(upcoming.slice(0, 10));
      setPastClasses(past.slice(0, 20));
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  };

  const handleOpenFeedback = (cls) => {
    setSelectedClass(cls);
    setFeedbackForm({
      content: cls.content || '',
      homework: cls.homework || '',
      notes: cls.notes || '',
      status: 'completed'
    });
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      // 更新上课记录
      await classOps.update(selectedClass.id, {
        ...feedbackForm,
        status: feedbackForm.status
      });
      
      // 如果状态为「已完成」，扣除课时
      if (feedbackForm.status === 'completed' && selectedClass.student_id) {
        console.log('开始扣除课时，学生ID:', selectedClass.student_id, '课时:', selectedClass.hours);
        // 获取学生的课时包
        const packagesData = await packageOps.getByStudent(selectedClass.student_id);
        const packages = packagesData || [];
        console.log('找到课时包:', packages);
        
        // 找到有剩余课时的包并扣除
        const hoursToDeduct = selectedClass.hours || 1;
        let remaining = hoursToDeduct;
        
        for (const pkg of packages) {
          if ((pkg.remaining || pkg.total - pkg.used) > 0 && remaining > 0) {
            const pkgRemaining = pkg.remaining !== undefined ? pkg.remaining : pkg.total - pkg.used;
            const toDeduct = Math.min(pkgRemaining, remaining);
            console.log(`更新课时包 ${pkg.id}: used ${pkg.used} -> ${pkg.used + toDeduct}`);
            // 只更新 used 字段，remaining 由后端计算
            await packageOps.update(pkg.id, {
              used: pkg.used + toDeduct
            });
            remaining -= toDeduct;
          }
        }
        console.log('课时扣除完成');
      }
      
      setShowFeedbackModal(false);
      setSelectedClass(null);
      loadTeacherData();
      alert('反馈提交成功！');
    } catch (err) {
      alert('提交失败：' + err.message);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>;
  }

  if (!teacher) {
    return <div className="p-8 text-center text-gray-500">教师不存在</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{teacher.name} 的教师门户</h1>
                <p className="text-sm text-gray-500">
                  {teacher.subjects?.length > 0 && `可授科目：${teacher.subjects.join(', ')}`}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 今日课程 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            今日课程 ({todayClasses.length})
          </h2>
          {todayClasses.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              今天没有课程安排
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayClasses.map(cls => (
                <div key={cls.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[cls.status]}`}>
                      {STATUS_LABELS[cls.status]}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{cls.student_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <span>{cls.subject}</span>
                    </div>
                  </div>
                  {cls.status === 'scheduled' && (
                    <button
                      onClick={() => handleOpenFeedback(cls)}
                      className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      提交上课反馈
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 即将到来的课程 */}
        {upcomingClasses.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              即将到来 ({upcomingClasses.length})
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">日期</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">学生</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">科目</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {upcomingClasses.map(cls => (
                    <tr key={cls.id}>
                      <td className="px-4 py-3 text-sm">{cls.date}</td>
                      <td className="px-4 py-3 text-sm">{formatTime(cls.start_time)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{cls.student_name}</td>
                      <td className="px-4 py-3 text-sm">{cls.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[cls.status]}`}>
                          {STATUS_LABELS[cls.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 历史课程 */}
        {pastClasses.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              历史记录 (最近20节)
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">日期</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">学生</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">科目</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">反馈</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pastClasses.map(cls => (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{cls.date}</td>
                      <td className="px-4 py-3 text-sm">{formatTime(cls.start_time)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{cls.student_name}</td>
                      <td className="px-4 py-3 text-sm">{cls.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[cls.status]}`}>
                          {STATUS_LABELS[cls.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {cls.status !== 'scheduled' ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            已提交
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            未提交
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* 反馈弹窗 */}
      {showFeedbackModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">提交上课反馈</h2>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-600 space-y-1">
                <div><span className="font-medium">学生：</span>{selectedClass.student_name}</div>
                <div><span className="font-medium">日期：</span>{selectedClass.date}</div>
                <div><span className="font-medium">时间：</span>{formatTime(selectedClass.start_time)}</div>
                <div><span className="font-medium">科目：</span>{selectedClass.subject}</div>
                <div><span className="font-medium">课时：</span>{selectedClass.hours || 1} 节</div>
              </div>
            </div>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上课内容</label>
                <textarea
                  value={feedbackForm.content}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                  rows={3}
                  placeholder="本节课学了什么..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作业布置</label>
                <textarea
                  value={feedbackForm.homework}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, homework: e.target.value })}
                  rows={2}
                  placeholder="课后作业..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                  rows={2}
                  placeholder="学生表现、需要改进的地方..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程状态</label>
                <select
                  value={feedbackForm.status}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="completed">已完成（扣除课时）</option>
                  <option value="absent">学生缺席（不扣课时）</option>
                  <option value="cancelled">已取消（不扣课时）</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  提交反馈
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
