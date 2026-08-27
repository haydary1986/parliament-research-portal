// VITE_API_BASE:
// - في development: http://localhost:8080 (Go dev server)
// - في production: "" (URL نسبي → nginx يوجِّه /api لـ Go على نفس الـ origin)
// نستخدم ?? بدلاً من || لأن empty string "" يجب أن يبقى كما هو
const RAW_BASE = import.meta.env.VITE_API_BASE;
const API_BASE = (RAW_BASE !== undefined ? RAW_BASE : 'http://localhost:8080') + '/api';

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

// تعديل بيانات الطلب (مدير الدائرة)
export function updateRequest(id, data) {
  return request('PUT', `/requests/${id}`, data);
}

// إحالة الطلب لقسم أو أكثر، مع إمكانية تعيين الباحث/الباحثين مباشرةً.
// extra: { researcher_ids, service_type, classification, completion_days }
export function assignRequest(id, departmentIds, extra = {}) {
  // يقبل مصفوفة أو string واحد (متوافق مع القديم)
  const payload = Array.isArray(departmentIds)
    ? { department_ids: departmentIds }
    : { department_id: departmentIds };
  return request('PUT', `/requests/${id}/assign`, { ...payload, ...extra });
}

export function confirmRequest(id, data) {
  // data قد يحوي researcher_id واحد أو researcher_ids (مصفوفة)
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

// إعادة تعيين كلمة مرور أي مستخدم (admin only)
export function adminResetPassword(id, newPassword) {
  return request('PUT', `/users/${id}/reset-password`, { new_password: newPassword });
}

// إنشاء عدة مستخدمين دفعة واحدة (admin only)
// users: [{name, email?, phone?, role?, committees?, deputy_id?}]
// returns: [{name, email, password, success, user_id?, error?}]
export function bulkCreateUsers(users) {
  return request('POST', '/users/bulk', { users });
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

// ربط ملف بمهمة بحث (بعد رفعه)
export function attachResearchFile(id, filename) {
  return request('PUT', `/research-tasks/${id}/file`, { file_path: filename });
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

// ========== Final Review (Manager) ==========
export function finalReviewRequest(id, decision, notes = '') {
  return request('PUT', `/requests/${id}/final-review`, { decision, notes });
}

// ========== Info Request Response (Researcher) ==========
export function updateInfoRequestResponse(id, data) {
  return request('PUT', `/information-requests/${id}/response`, data);
}

// ========== Archive Consent (Researcher) ==========
export function updateArchiveConsent(id, consent, notes = '') {
  return request('PUT', `/research-tasks/${id}/archive-consent`, { consent, notes });
}

// ========== Workflow الجديد (req.md) ==========
// رئيس القسم يراجع البحث المسلَّم
export function deptHeadReview(id, decision, proofreaderId, notes = '') {
  return request('PUT', `/requests/${id}/dept-review`, { decision, proofreader_id: proofreaderId, notes });
}

// الباحث يحيل للمعاون
export function referToAssistant(taskId) {
  return request('PUT', `/research-tasks/${taskId}/refer-assistant`);
}

// المعاون يدقق نهائياً — ويستطيع تصحيح تصنيف السرية قبل التوجيه
export function assistantFinalReview(id, decision, notes = '', confidentiality) {
  const payload = { decision, notes };
  if (confidentiality) payload.confidentiality = confidentiality;
  return request('PUT', `/requests/${id}/assistant-review`, payload);
}

// رئيس القسم يرسل البحث العام للنائب
export function deptSendToDeputy(id) {
  return request('PUT', `/requests/${id}/dept-send`);
}

// مدير الدائرة يرسل البحث ذا الخصوصية للنائب
export function managerSendToDeputy(id) {
  return request('PUT', `/requests/${id}/manager-send`);
}

// إعادة إسناد مهمة بحث لباحث بديل (رئيس القسم أو مدير الدائرة)
export function reassignResearchTask(taskId, researcherId, notes = '') {
  return request('PUT', `/research-tasks/${taskId}/reassign`, {
    researcher_id: researcherId,
    notes,
  });
}

// ========== Logout ==========
export async function logout() {
  try {
    await request('POST', '/auth/logout');
  } catch {
    // ignore — local logout always succeeds
  }
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
