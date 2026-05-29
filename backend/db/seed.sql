-- بيانات تجريبية - Seed Data
-- منصة البحوث البرلمانية - مجلس النواب العراقي

-- =============================================
-- الأقسام الخمسة الرسمية - Departments
-- (نقطة 1 من بوابة المدير في متطلبات البرلمان)
-- =============================================
INSERT OR IGNORE INTO departments (id, name, head_name, researcher_count, active_requests, color) VALUES
('research',          'قسم البحوث',                  'د. سعاد العلوي',   3, 2, '#0A2540'),
('budget_research',   'قسم بحوث الموازنة',           'أ. حسن الربيعي',   2, 1, '#B8860B'),
('legal_studies',     'قسم الدراسات القانونية',       'أ. علي الموسوي',   3, 2, '#243B53'),
('parliament_library','قسم المكتبة النيابية',         'د. منى الساعدي',   2, 1, '#966B08'),
('research_support',  'قسم الدعم البحثي',            'د. كريم الجبوري',   2, 1, '#102A43');

-- =============================================
-- الصلاحيات - Permissions
-- =============================================
INSERT OR IGNORE INTO permissions (name, description, category) VALUES
('submit_request', 'تقديم طلب بحثي', 'requests'),
('view_own_requests', 'عرض الطلبات الخاصة', 'requests'),
('view_all_requests', 'عرض جميع الطلبات', 'management'),
('manage_requests', 'إدارة الطلبات', 'management'),
('assign_department', 'إحالة لقسم', 'management'),
('assign_researchers', 'تعيين باحثين', 'departments'),
('view_department', 'عرض بيانات القسم', 'departments'),
('confirm_request', 'تأكيد الطلب', 'departments'),
('view_assigned', 'عرض المهام المسندة', 'research'),
('submit_research', 'تسليم بحث', 'research'),
('request_info', 'طلب معلومات', 'research'),
('proofread', 'تدقيق لغوي', 'proofreading'),
('edit_research', 'تعديل البحث', 'proofreading'),
('assistant_final_review', 'التدقيق النهائي للمعاون', 'assistant'),
('manage_users', 'إدارة المستخدمين', 'system'),
('view_reports', 'عرض التقارير', 'system'),
('system_settings', 'إعدادات النظام', 'system'),
('full_access', 'صلاحيات كاملة', 'system');

-- =============================================
-- المستخدمين - Users (password: 123456)
-- =============================================

-- مدير النظام (أدمن) - كلمة المرور: 123456 (نفس الـ hash للجميع للتطوير)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, status) VALUES
(1, 'مدير النظام', 'admin@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'admin', NULL, 'active');

-- مدير الدائرة
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, status) VALUES
(2, 'مدير الدائرة', 'manager@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'manager', NULL, 'active');

-- النواب - Deputies (بأسماء لجان رسمية)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, deputy_id, committee, phone, status) VALUES
(3, 'د. خالد العبيدي',   'khaled@parliament.iq',  '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-001', 'اللجنة المالية', '07701234567', 'active'),
(4, 'أ. سارة عبدالرحمن', 'sara@parliament.iq',    '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-002', 'اللجنة القانونية', '07701234568', 'active'),
(5, 'د. أحمد الجبوري',   'ahmed.j@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-003', 'لجنة النفط والغاز والثروات الطبيعية', '07701234569', 'active'),
(6, 'أ. فاطمة الموسوي',  'fatima@parliament.iq',  '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-004', 'لجنة الصحة ومكافحة المخدرات والمؤثرات العقلية', '07701234570', 'active'),
(7, 'د. عمر المالكي',    'omar@parliament.iq',    '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-005', 'لجنة التربية', '07701234571', 'active');

-- رؤساء الأقسام - Department Heads
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, status) VALUES
(8,  'د. سعاد العلوي',  'suad@parliament.iq',   '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'research', 'active'),
(9,  'أ. حسن الربيعي',  'hassan@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'budget_research', 'active'),
(10, 'أ. علي الموسوي',  'ali.m@parliament.iq',  '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'legal_studies', 'active'),
(11, 'د. منى الساعدي',  'muna@parliament.iq',   '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'parliament_library', 'active'),
(12, 'د. كريم الجبوري', 'kareem@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'research_support', 'active');

-- الباحثين - Researchers
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, specialization, status) VALUES
(13, 'د. نور الدين',     'nour@parliament.iq',    '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'research', 'بحوث عامة', 'active'),
(14, 'أ. رنا علي',       'rana@parliament.iq',    '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'legal_studies', 'قانون دستوري', 'active'),
(15, 'أ. حسين كاظم',     'hussein@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'budget_research', 'موازنة عامة', 'active'),
(16, 'د. ليلى عباس',     'layla@parliament.iq',   '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'parliament_library', 'أرشفة ومعلومات', 'active'),
(17, 'أ. مصطفى جواد',    'mustafa@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'research_support', 'دعم بحثي', 'active');

-- المدققين - Proofreaders
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) VALUES
(18, 'أ. محمد الخطاط',   'mohammed.k@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'proofreader', 'active'),
(19, 'أ. هدى السامرائي', 'huda@parliament.iq',       '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'proofreader', 'active'),
(20, 'أ. ياسر الكناني',  'yaser@parliament.iq',      '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'proofreader', 'active');

-- المعاون - Assistant Manager (دور جديد للتدقيق النهائي)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) VALUES
(21, 'د. عبدالكريم الأنصاري', 'assistant@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'assistant_manager', 'active');

-- =============================================
-- صلاحيات المستخدمين
-- =============================================
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT 1, id FROM permissions WHERE name = 'full_access';
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT 2, id FROM permissions WHERE name IN ('view_all_requests', 'manage_requests', 'assign_department', 'view_reports');
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'deputy' AND p.name IN ('submit_request', 'view_own_requests');
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'department_head' AND p.name IN ('manage_requests', 'assign_researchers', 'view_department', 'confirm_request');
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'researcher' AND p.name IN ('view_assigned', 'submit_research', 'request_info');
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'proofreader' AND p.name IN ('proofread', 'edit_research');
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'assistant_manager' AND p.name IN ('assistant_final_review', 'view_all_requests');

-- =============================================
-- طلبات تجريبية - Sample Requests
-- =============================================
INSERT OR IGNORE INTO requests (id, title, description, deputy_id, deputy_name, committee, purpose, phone, email, status, assigned_department, can_share, date_received, deadline) VALUES
('REQ-001', 'دراسة حول تأثير السياسات المالية على التضخم',
 'نطلب إعداد دراسة شاملة حول تأثير السياسات المالية الحكومية على معدلات التضخم في العراق خلال الفترة 2020-2024',
 3, 'د. خالد العبيدي', 'اللجنة المالية', 'oversight', '07701234567', 'khaled@parliament.iq',
 'in_progress', 'budget_research', 1, '2026-04-15', '2026-05-15'),

('REQ-002', 'تحليل مشروع قانون الأحوال الشخصية المعدل',
 'تحليل قانوني شامل لمشروع قانون الأحوال الشخصية المعدل ومقارنته بالتشريعات الإقليمية',
 4, 'أ. سارة عبدالرحمن', 'اللجنة القانونية', 'legislative', '07701234568', 'sara@parliament.iq',
 'assigned', 'legal_studies', 0, '2026-04-18', '2026-05-18'),

('REQ-003', 'تقرير حول واقع قطاع النفط والغاز',
 'إعداد تقرير مفصل حول واقع قطاع النفط والغاز في العراق والتحديات المستقبلية',
 5, 'د. أحمد الجبوري', 'لجنة النفط والغاز والثروات الطبيعية', 'oversight', '07701234569', 'ahmed.j@parliament.iq',
 'completed', 'research', 1, '2026-04-10', '2026-05-10'),

('REQ-004', 'دراسة حول الوضع الصحي في المحافظات',
 'دراسة ميدانية حول واقع الخدمات الصحية في المحافظات العراقية',
 6, 'أ. فاطمة الموسوي', 'لجنة الصحة ومكافحة المخدرات والمؤثرات العقلية', 'oversight', '07701234570', 'fatima@parliament.iq',
 'pending', NULL, 0, '2026-04-25', '2026-06-01'),

('REQ-005', 'ورقة إحاطة حول إصلاح المناهج الدراسية',
 'إعداد ورقة إحاطة حول خطة إصلاح المناهج الدراسية وتأثيرها على جودة التعليم',
 7, 'د. عمر المالكي', 'لجنة التربية', 'legislative', '07701234571', 'omar@parliament.iq',
 'proofreading', 'research', 0, '2026-04-20', '2026-05-20');

-- إحالات متعددة (نقطة 1 من المدير: نفس الطلب لأكثر من قسم)
INSERT OR IGNORE INTO request_departments (request_id, department_id) VALUES
('REQ-001', 'budget_research'),
('REQ-001', 'research'),       -- مثال: REQ-001 محال إلى قسمين
('REQ-002', 'legal_studies'),
('REQ-003', 'research'),
('REQ-003', 'research_support'),
('REQ-005', 'research');

-- =============================================
-- تأكيدات الطلبات
-- =============================================
INSERT OR IGNORE INTO request_confirmations (request_id, service_type, classification, completion_days, confirmed_by) VALUES
('REQ-001', 'دراسة', 'مالية واقتصادية', 30, 9),
('REQ-003', 'تقرير', 'علمي', 25, 8),
('REQ-005', 'ورقة إحاطة', 'اجتماعي', 20, 8);

-- =============================================
-- مهام البحث
-- =============================================
INSERT OR IGNORE INTO research_tasks (id, request_id, researcher_id, status, date_assigned, deadline, completion_days) VALUES
('RT-001', 'REQ-001', 15, 'in_progress', '2026-04-17', '2026-05-15', 30),
('RT-002', 'REQ-003', 13, 'completed',   '2026-04-12', '2026-05-10', 25),
('RT-003', 'REQ-005', 13, 'sent_to_proofreader', '2026-04-22', '2026-05-20', 20);

-- =============================================
-- طلبات المعلومات
-- =============================================
INSERT OR IGNORE INTO information_requests (research_task_id, number, target_entity, subject, status, date_sent) VALUES
('RT-001', 'INF-001', 'وزارة المالية', 'بيانات الموازنة العامة 2020-2024', 'received', '2026-04-19'),
('RT-001', 'INF-002', 'البنك المركزي العراقي', 'تقارير التضخم الشهرية', 'sent', '2026-04-20'),
('RT-002', 'INF-001', 'وزارة النفط', 'إحصائيات الإنتاج والتصدير', 'received', '2026-04-14');

-- =============================================
-- مهام التدقيق
-- =============================================
INSERT OR IGNORE INTO proofreading_tasks (id, research_task_id, proofreader_id, status, assigned_date) VALUES
('PT-001', 'RT-002', 18, 'completed',  '2026-05-05'),
('PT-002', 'RT-003', 19, 'in_progress', '2026-05-15');

-- =============================================
-- الملاحظات
-- =============================================
INSERT OR IGNORE INTO notes (entity_type, entity_id, user_id, user_name, content, created_at) VALUES
('request', 'REQ-001', 2, 'مدير الدائرة', 'تمت إحالة الطلب إلى قسم بحوث الموازنة وقسم البحوث', '2026-04-16 10:00:00'),
('request', 'REQ-001', 9, 'أ. حسن الربيعي', 'تم تأكيد الطلب وتعيين الباحث أ. حسين كاظم', '2026-04-17 09:00:00'),
('research_task', 'RT-001', 15, 'أ. حسين كاظم', 'تم البدء بجمع البيانات من وزارة المالية', '2026-04-18 11:00:00');

-- =============================================
-- سجل النشاطات
-- =============================================
INSERT OR IGNORE INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details, created_at) VALUES
(3,  'د. خالد العبيدي', 'create_request',  'request',       'REQ-001', 'تقديم طلب بحثي جديد',              '2026-04-15 08:30:00'),
(2,  'مدير الدائرة',     'assign_request',  'request',       'REQ-001', 'إحالة لقسمين: بحوث الموازنة + البحوث', '2026-04-16 10:00:00'),
(9,  'أ. حسن الربيعي',  'confirm_request', 'request',       'REQ-001', 'تأكيد الطلب وتعيين باحث',          '2026-04-17 09:00:00'),
(15, 'أ. حسين كاظم',    'start_research',  'research_task', 'RT-001',  'بدء العمل على البحث',              '2026-04-18 11:00:00');

-- =============================================
-- الإشعارات
-- =============================================
INSERT OR IGNORE INTO notifications (user_id, title, message, type, is_read, entity_type, entity_id) VALUES
(3,  'تم إحالة طلبك',     'تمت إحالة طلبك REQ-001 إلى قسم بحوث الموازنة وقسم البحوث',                'info',    1, 'request',       'REQ-001'),
(15, 'مهمة بحثية جديدة',  'تم تعيينك للعمل على بحث الطلب REQ-001',                                   'info',    1, 'research_task', 'RT-001'),
(4,  'تم استلام طلبك',    'تم استلام طلبك REQ-002 وسيتم مراجعته قريباً',                              'success', 0, 'request',       'REQ-002'),
(21, 'بحث جاهز للمراجعة', 'هناك بحث منتظر التدقيق النهائي',                                          'info',    0, 'request',       'REQ-003');
