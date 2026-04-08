import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { teacherOps, studentOps, classOps, packageOps } from '../store';

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    teacher_id: '',
    date: '',
    time: '10:00',
    duration: 60,
    subject: '英语',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teachersData, studentsData] = await Promise.all([
        teacherOps.getAll(),
        studentOps.getAll()
      ]);
      setTeachers(Array.isArray(teachersData) ? teachersData.filter(t => t.status === 'active') : []);
      setStudents(Array.isArray(studentsData) ? studentsData.filter(s => s.status === 'active') : []);

      const classesData = await classOps.getAll();
      const scheduled = Array.isArray(classesData) ? classesData.filter(c => c.status === 'scheduled') : [];
      setSchedules(scheduled);
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  };

  const getTwoWeeks = () => {
    const weeks = [];
    for (let w = 0; w < 2; w++) {
      const week = [];
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + (w * 7));
      for (let d = 0; d < 7; d++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + d);
        week.push(date);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSlotClick = (date, time) => {
    setFormData({
      student_id: '',
      teacher_id: '',
      date: formatDateKey(date),
      time: time,
      duration: 60,
      subject: '英语',
      notes: ''
    });
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      student_id: schedule.student_id?.toString() || '',
      teacher_id: schedule.teacher_id?.toString() || '',
      date: schedule.date,
      time: schedule.start_time || '10:00',
      duration: schedule.hours ? schedule.hours * 60 : 60,
      subject: schedule.subject || '英语',
      notes: schedule.notes || ''
    });
    setShowModal(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('确定要删除这节课吗？')) return;
    try {
      await classOps.delete(scheduleId);
      loadData();
    } catch (err) {
      alert('删除失败：' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 检查学生课时是否足够（仅新增时检查）
      if (formData.student_id && !editingSchedule) {
        const packagesData = await packageOps.getByStudent(formData.student_id);
        const totalRemaining = (packagesData || []).reduce((sum, p) => sum + (p.remaining || 0), 0);
        const hoursNeeded = formData.duration / 60;
        
        if (totalRemaining < hoursNeeded) {
          alert(`课时不足！该学生剩余 ${totalRemaining} 节，需要 ${hoursNeeded} 节。请先购买课时。`);
          return;
        }
      }
      
      // 计算结束时间
      const [hours, minutes] = formData.time.split(':').map(Number);
      const endHours = hours + Math.floor(formData.duration / 60);
      const endMinutes = minutes + (formData.duration % 60);
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      
      const scheduleData = {
        student_id: formData.student_id ? parseInt(formData.student_id) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        teacher: teachers.find(t => t.id === parseInt(formData.teacher_id))?.name || '',
        date: formData.date,
        start_time: formData.time,
        end_time: endTime,
        hours: formData.duration / 60,
        subject: formData.subject,
        notes: formData.notes,
        status: 'scheduled'
      };
      
      if (editingSchedule) {
        await classOps.update(editingSchedule.id, scheduleData);
      } else {
        if (!scheduleData.student_id) {
          alert('请选择学生');
          return;
        }
        await classOps.add(scheduleData.student_id, scheduleData);
      }
      
      setShowModal(false);
      setEditingSchedule(null);
      loadData();
    } catch (err) {
      alert('保存失败：' + err.message);
    }
  };

  const getSchedulesForSlot = (dateKey, time) => {
    return schedules.filter(s => s.date === dateKey && s.start_time === time);
  };

  const getStudentName = (id) => {
    if (!id) return '未知学生';
    const student = students.find(s => s.id === parseInt(id) || s.id === id);
    return student?.name || '未知学生';
  };

  const getTeacherName = (id) => {
    if (!id) return '未知教师';
    const teacher = teachers.find(t => t.id === parseInt(id) || t.id === id);
    return teacher?.name || '未知教师';
  };

  const weeks = getTwoWeeks();

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">排课管理</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            今天
          </button>
          <button
            onClick={handlePrevWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-gray-600 font-medium">
            {weeks[0][0].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} -
            {weeks[1][6].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* 表头 */}
          <div className="grid grid-cols-[60px_repeat(14,1fr)] border-b">
            <div className="p-2 text-center text-gray-500 font-medium border-r">时间</div>
            {weeks.map((week, weekIdx) => (
              week.map((date, dayIdx) => (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={`p-2 text-center border-r ${isToday(date) ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-xs text-gray-500">{DAYS[date.getDay()]}</div>
                  <div className={`font-medium ${isToday(date) ? 'text-blue-600' : ''}`}>
                    {formatDisplayDate(date)}
                  </div>
                </div>
              ))
            ))}
          </div>

          {/* 时间行 */}
          {TIME_SLOTS.map(time => (
            <div key={time} className="grid grid-cols-[60px_repeat(14,1fr)] border-b hover:bg-gray-50">
              <div className="p-2 text-center text-sm text-gray-500 border-r bg-gray-50">
                {time}
              </div>
              {weeks.map((week, weekIdx) => (
                week.map((date, dayIdx) => {
                  const dateKey = formatDateKey(date);
                  const slotSchedules = getSchedulesForSlot(dateKey, time);
                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}-${time}`}
                      onClick={() => handleSlotClick(date, time)}
                      className={`min-h-[50px] p-1 border-r cursor-pointer relative ${
                        isToday(date) ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {slotSchedules.map(schedule => (
                        <div
                          key={schedule.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSchedule(schedule);
                          }}
                          className="bg-purple-100 text-purple-800 text-xs p-1 rounded mb-1 hover:bg-purple-200 group relative"
                        >
                          <div className="font-medium truncate">
                            {getStudentName(schedule.student_id)}
                          </div>
                          <div className="text-purple-600 truncate">
                            {getTeacherName(schedule.teacher_id)}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchedule(schedule.id);
                            }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 添加/编辑排课弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingSchedule ? '编辑排课' : '添加排课'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 *</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">选择学生</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教师 *</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">选择教师</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时长（分钟）</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={40}>40分钟</option>
                    <option value={60}>60分钟</option>
                    
                    
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">科目</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="英语"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
