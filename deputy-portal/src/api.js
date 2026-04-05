const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8080') + '/api';

let authToken = null;

export function setToken(token) {
  authToken = token;
}

export function getToken() {
  return authToken;
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const opts = { method, headers };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'خطأ في الاتصال بالخادم');
  }

  return data;
}

// ========== Auth ==========
export async function login(email, password) {
  const data = await request('POST', '/auth/login', { email, password });
  if (data.success && data.data?.token) {
    authToken = data.data.token;
  }
  return data;
}

// ========== Dashboard ==========
export function getDashboardStats() {
  return request('GET', '/dashboard/stats');
}

// ========== Requests ==========
export function getRequests(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request('GET', `/requests${query ? '?' + query : ''}`);
}

export function getRequest(id) {
  return request('GET', `/requests/${id}`);
}

export function createRequest(data) {
  return request('POST', '/requests', data);
}

export function assignRequest(id, departmentId) {
  return request('PUT', `/requests/${id}/assign`, { department_id: departmentId });
}

export function confirmRequest(id, data) {
  return request('PUT', `/requests/${id}/confirm`, data);
}

// ========== Users ==========
export function getUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request('GET', `/users${query ? '?' + query : ''}`);
}

export function getUser(id) {
  return request('GET', `/users/${id}`);
}

export function createUser(data) {
  return request('POST', '/users', data);
}

export function updateUserStatus(id, status) {
  return request('PUT', `/users/${id}/status`, { status });
}

// ========== Departments ==========
export function getDepartments() {
  return request('GET', '/departments');
}

export function getDepartment(id) {
  return request('GET', `/departments/${id}`);
}

// ========== Research Tasks ==========
export function getResearchTasks(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request('GET', `/research-tasks${query ? '?' + query : ''}`);
}

export function getResearchTask(id) {
  return request('GET', `/research-tasks/${id}`);
}

export function updateResearchTaskStatus(id, status) {
  return request('PUT', `/research-tasks/${id}/status`, { status });
}

export function createInfoRequest(taskId, data) {
  return request('POST', `/research-tasks/${taskId}/info-requests`, data);
}

// ========== Proofreading ==========
export function getProofreadingTasks(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request('GET', `/proofreading-tasks${query ? '?' + query : ''}`);
}

export function createProofreadingTask(data) {
  return request('POST', '/proofreading-tasks', data);
}

export function updateProofreadingStatus(id, data) {
  return request('PUT', `/proofreading-tasks/${id}/status`, data);
}

// ========== Notifications ==========
export function getNotifications() {
  return request('GET', '/notifications');
}

export function markNotificationRead(id) {
  return request('PUT', `/notifications/${id}/read`);
}

// ========== Notes ==========
export function createNote(data) {
  return request('POST', '/notes', data);
}

// ========== Activity Logs ==========
export function getActivityLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request('GET', `/activity-logs${query ? '?' + query : ''}`);
}

// ========== Return Request (Manager) ==========
export function returnRequest(id, data) {
  return request('PUT', `/requests/${id}/return`, data);
}

// ========== Logout ==========
export async function logout() {
  try {
    await request('POST', '/auth/logout');
  } catch {}
  authToken = null;
}

// ========== Change Password ==========
export function changePassword(oldPassword, newPassword) {
  return request('PUT', '/auth/change-password', { old_password: oldPassword, new_password: newPassword });
}

// ========== Archive Search ==========
export function searchArchive(query) {
  return request('GET', `/archive/search?q=${encodeURIComponent(query)}`);
}

// ========== File Upload ==========
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'فشل رفع الملف');
  }
  return data;
}

export function getFileUrl(filename) {
  return `${API_BASE}/files/${filename}`;
}

// ========== Security Stats (Admin) ==========
export function getSecurityStats() {
  return request('GET', '/security/stats');
}
