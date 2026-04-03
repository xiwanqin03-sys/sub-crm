// API 配置
const API_BASE_URL = 'https://sunnybridge-crm-api.xiwanqin03.workers.dev/api/v1';
const API_KEY = 'sunnybridge-dev-key-2024';

// 通用请求函数
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers,
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  
  // 处理空响应（204 No Content）
  if (response.status === 204) {
    return null;
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }
  return data;
}

// ============================================
// 学生相关操作
// ============================================
export const studentOps = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/students?${query}` : '/students';
    const result = await request(endpoint);
    return result.data?.data || result.data || [];
  },
  getById: async (id) => {
    const result = await request(`/students/${id}`);
    return result.data;
  },
  add: async (student) => {
    const result = await request('/students', {
      method: 'POST',
      body: student,
    });
    return result.data;
  },
  update: async (id, updates) => {
    const result = await request(`/students/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    return result.data;
  },
  delete: async (id) => {
    await request(`/students/${id}`, { method: 'DELETE' });
    return true;
  },
  getPaginated: async (page = 1, pageSize = 20, filters = {}) => {
    const params = { page, page_size: pageSize, ...filters };
    const query = new URLSearchParams(params).toString();
    const result = await request(`/students?${query}`);
    return result.data?.data || [];
  },
  search: async (searchTerm, status = '') => {
    const params = { search: searchTerm };
    if (status) params.status = status;
    const query = new URLSearchParams(params).toString();
    const result = await request(`/students?${query}`);
    return result.data?.data || [];
  },
};

// ============================================
// 课时包相关操作
// ============================================
export const packageOps = {
  getByStudent: async (studentId) => {
    const result = await request(`/packages/student/${studentId}`);
    return result.data?.data || result.data || [];
  },
  getAll: async () => {
    const result = await request('/packages');
    return result.data?.data || result.data || [];
  },
  add: async (studentId, pkg) => {
    // 使用正确的路由: /packages/student/:student_id
    const result = await request(`/packages/student/${studentId}`, {
      method: 'POST',
      body: pkg,
    });
    return result.data;
  },
  update: async (id, updates) => {
    const result = await request(`/packages/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    return result.data;
  },
  delete: async (id) => {
    await request(`/packages/${id}`, { method: 'DELETE' });
    return true;
  },
};

// ============================================
// 上课记录相关操作
// ============================================
export const classOps = {
  getByStudent: async (studentId, params = {}) => {
    const queryParams = { ...params, student_id: studentId };
    const query = new URLSearchParams(queryParams).toString();
    const result = await request(`/classes?${query}`);
    return result.data?.data || result.data || [];
  },
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/classes?${query}` : '/classes';
    const result = await request(endpoint);
    return result.data?.data || result.data || [];
  },
  add: async (studentId, cls) => {
    const result = await request(`/classes/student/${studentId}`, {
      method: 'POST',
      body: cls,
    });
    return result.data;
  },
  update: async (id, updates) => {
    const result = await request(`/classes/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    return result.data;
  },
  delete: async (id) => {
    await request(`/classes/${id}`, { method: 'DELETE' });
    return true;
  },
};

// ============================================
// 应收账款相关操作
// ============================================
export const receivableOps = {
  getByStudent: async (studentId) => {
    const result = await request(`/receivables/student/${studentId}`);
    return result.data?.data || result.data || [];
  },
  getAll: async () => {
    const result = await request('/receivables');
    return result.data?.data || result.data || [];
  },
  add: async (studentId, receivable) => {
    const result = await request(`/receivables/student/${studentId}`, {
      method: 'POST',
      body: receivable,
    });
    return result.data;
  },
  markPaid: async (id) => {
    const result = await request(`/receivables/${id}/paid`, {
      method: 'POST',
    });
    return result.data;
  },
  delete: async (id) => {
    await request(`/receivables/${id}`, { method: 'DELETE' });
    return true;
  },
};

// ============================================
// 付款记录相关操作
// ============================================
export const paymentOps = {
  getByStudent: async (studentId) => {
    // 使用正确的路由: /payments/student/:student_id
    const result = await request(`/payments/student/${studentId}`);
    return result.data?.data || result.data || [];
  },
  getAll: async () => {
    const result = await request('/payments');
    return result.data?.data || result.data || [];
  },
  add: async (studentId, payment) => {
    // 使用正确的路由: /payments/student/:student_id
    const result = await request(`/payments/student/${studentId}`, {
      method: 'POST',
      body: payment,
    });
    return result.data;
  },
  delete: async (id) => {
    await request(`/payments/${id}`, { method: 'DELETE' });
    return true;
  },
};

// ============================================
// 教师相关操作
// ============================================
export const teacherOps = {
  getAll: async () => {
    const result = await request('/teachers');
    return result.data?.data || result.data || [];
  },
  getById: async (id) => {
    const result = await request(`/teachers/${id}`);
    return result.data;
  },
  add: async (teacher) => {
    const result = await request('/teachers', {
      method: 'POST',
      body: teacher,
    });
    return result.data;
  },
  update: async (id, updates) => {
    const result = await request(`/teachers/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    return result.data;
  },
  delete: async (id) => {
    await request(`/teachers/${id}`, { method: 'DELETE' });
    return true;
  },
};

// ============================================
// 课程相关操作
// ============================================
export const courseOps = {
  getAll: async () => {
    const result = await request('/courses');
    return result.data?.data || result.data || [];
  },
  getById: async (id) => {
    const result = await request(`/courses/${id}`);
    return result.data;
  },
  add: async (course) => {
    const result = await request('/courses', {
      method: 'POST',
      body: course,
    });
    return result.data;
  },
  update: async (id, updates) => {
    const result = await request(`/courses/${id}`, {
      method: 'PATCH',
      body: updates,
    });
    return result.data;
  },
  delete: async (id) => {
    await request(`/courses/${id}`, { method: 'DELETE' });
    return true;
  },
};

// ============================================
// 统计数据
// ============================================
export async function getStats() {
  const result = await request('/dashboard/stats');
  const data = result.data;

  return {
    todayClasses: data.today?.classes || 0,
    newStudentsThisMonth: data.this_month?.new_students || 0,
    activeStudents: data.this_month?.active_students || 0,
    classesThisMonth: data.this_month?.classes || 0,
    revenueThisMonth: data.this_month?.revenue || 0,
    warningStudents: data.warnings?.low_balance_students?.length || 0,
    warningStudentDetails: data.warnings?.low_balance_students || [],
  };
}

// ============================================
// 今日课程
// ============================================
export async function getTodayClasses() {
  const result = await request('/dashboard/today');
  return result.data || [];
}

// ============================================
// 搜索
// ============================================
export async function searchAll(query, type = '') {
  const params = { q: query };
  if (type) params.type = type;
  const queryString = new URLSearchParams(params).toString();
  const result = await request(`/search?${queryString}`);
  return result.data;
}

// ============================================
// 设置相关操作
// ============================================
export const settingsOps = {
  getAll: async () => {
    const result = await request('/settings');
    return result.data;
  },
  update: async (settings) => {
    const result = await request('/settings', {
      method: 'PATCH',
      body: settings,
    });
    return result.data;
  },
};

// ============================================
// 数据导出/导入
// ============================================
export async function exportData(format = 'json') {
  const result = await request(`/export?format=${format}`);
  return result;
}

export async function importData(file, mode = 'merge') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);

  const response = await fetch(`${API_BASE_URL}/import`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Import failed');
  }
  return data;
}

// ============================================
// 管理操作
// ============================================
export const adminOps = {
  clearAll: async () => {
    const result = await request('/admin/clear-all', { method: 'POST' });
    return result.data;
  },
  getStats: async () => {
    const result = await request('/admin/stats');
    return result.data;
  },
};

// ============================================
// 兼容旧代码的 localStorage 回退
// ============================================
const STORAGE_KEY = 'sunnybridge_crm_data';
const USE_API = true;

export function loadData() {
  if (USE_API) {
    console.warn('loadData() is deprecated, use studentOps.getAll() instead');
    return { students: [], packages: [], payments: [], classes: [], settings: {} };
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('加载数据失败:', e);
  }
  return { students: [], packages: [], payments: [], classes: [], settings: {} };
}

export function saveData(data) {
  if (USE_API) {
    console.warn('saveData() is deprecated, use API operations instead');
    return true;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('保存数据失败:', e);
    return false;
  }
}
