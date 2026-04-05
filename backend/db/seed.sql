-- بيانات تجريبية - Seed Data

-- =============================================
-- الأقسام - Departments
-- =============================================
INSERT OR IGNORE INTO departments (id, name, head_name, researcher_count, active_requests, color) VALUES
('financial', 'البحوث المالية والاقتصادية', 'د. سعاد العلوي', 3, 2, '#f59e0b'),
('political', 'البحوث السياسية والاستراتيجية', 'أ. حسن الربيعي', 4, 3, '#3b82f6'),
('legal', 'الدراسات القانونية والتشريعية', 'أ. علي الموسوي', 3, 2, '#8b5cf6'),
('social', 'البحوث الاجتماعية والتربوية', 'د. منى الساعدي', 2, 1, '#10b981'),
('scientific', 'البحوث العلمية والتقنية', 'د. كريم الجبوري', 3, 2, '#ef4444');

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
('manage_users', 'إدارة المستخدمين', 'system'),
('view_reports', 'عرض التقارير', 'system'),
('system_settings', 'إعدادات النظام', 'system'),
('full_access', 'صلاحيات كاملة', 'system');

-- =============================================
-- المستخدمين - Users (password: 123456 -> hashed placeholder)
-- =============================================

-- مدير النظام
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, status) VALUES
(1, 'مدير النظام', 'admin@parliament.iq', '$2a$10$aKNxJuhFUxcCNaqZ64byd.7RKhaZjgGaeEOr8bwVOqIfOZ2GJlK2K', 'admin', NULL, 'active');

-- المدير العام
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, status) VALUES
(2, 'مدير النظام', 'manager@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'manager', NULL, 'active');

-- النواب - Deputies
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, deputy_id, committee, phone, status) VALUES
(3, 'د. خالد العبيدي', 'khaled@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-001', 'اللجنة المالية', '07701234567', 'active'),
(4, 'أ. سارة عبدالرحمن', 'sara@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-002', 'اللجنة القانونية', '07701234568', 'active'),
(5, 'د. أحمد الجبوري', 'ahmed.j@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-003', 'لجنة النفط والطاقة', '07701234569', 'active'),
(6, 'أ. فاطمة الموسوي', 'fatima@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-004', 'لجنة الصحة والبيئة', '07701234570', 'active'),
(7, 'د. عمر المالكي', 'omar@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'deputy', 'DEP-005', 'لجنة التعليم', '07701234571', 'active');

-- رؤساء الأقسام - Department Heads
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, status) VALUES
(8, 'د. سعاد العلوي', 'suad@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'financial', 'active'),
(9, 'أ. حسن الربيعي', 'hassan@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'political', 'active'),
(10, 'أ. علي الموسوي', 'ali.m@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'legal', 'active'),
(11, 'د. منى الساعدي', 'muna@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'social', 'active'),
(12, 'د. كريم الجبوري', 'kareem@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'department_head', 'scientific', 'active');

-- الباحثين - Researchers
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, specialization, status) VALUES
(13, 'د. نور الدين', 'nour@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'financial', 'اقتصاد كلي', 'active'),
(14, 'أ. رنا علي', 'rana@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'legal', 'قانون دستوري', 'active'),
(15, 'أ. حسين كاظم', 'hussein@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'political', 'علاقات دولية', 'active'),
(16, 'د. ليلى عباس', 'layla@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'social', 'علم اجتماع', 'active'),
(17, 'أ. مصطفى جواد', 'mustafa@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'researcher', 'scientific', 'هندسة بيئية', 'active');

-- المدققين - Proofreaders
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status) VALUES
(18, 'أ. محمد الخطاط', 'mohammed.k@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'proofreader', 'active'),
(19, 'أ. هدى السامرائي', 'huda@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'proofreader', 'active'),
(20, 'أ. ياسر الكناني', 'yaser@parliament.iq', '$2a$10$GcWkIIlSvHAEQGxCsftciekkncZCUAK7TAk.DGsoOZ3OcHK8w0qNW', 'proofreader', 'active');

-- =============================================
-- صلاحيات المستخدمين - User Permissions
-- =============================================

-- Admin - full access
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT 1, id FROM permissions WHERE name = 'full_access';

-- Manager
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT 2, id FROM permissions WHERE name IN ('view_all_requests', 'manage_requests', 'assign_department', 'view_reports');

-- Deputies
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'deputy' AND p.name IN ('submit_request', 'view_own_requests');

-- Department Heads
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'department_head' AND p.name IN ('manage_requests', 'assign_researchers', 'view_department', 'confirm_request');

-- Researchers
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'researcher' AND p.name IN ('view_assigned', 'submit_research', 'request_info');

-- Proofreaders
INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT u.id, p.id FROM users u, permissions p WHERE u.role = 'proofreader' AND p.name IN ('proofread', 'edit_research');

-- =============================================
-- الطلبات - Requests
-- =============================================
INSERT OR IGNORE INTO requests (id, title, description, deputy_id, deputy_name, committee, purpose, phone, email, status, assigned_department, date_received, deadline) VALUES
('REQ-001', 'دراسة حول تأثير السياسات المالية على التضخم', 'نطلب إعداد دراسة شاملة حول تأثير السياسات المالية الحكومية على معدلات التضخم في العراق خلال الفترة 2020-2024', 3, 'د. خالد العبيدي', 'اللجنة المالية', 'oversight', '07701234567', 'khaled@parliament.iq', 'in_progress', 'financial', '2024-01-15', '2024-02-15'),
('REQ-002', 'تحليل مشروع قانون الأحوال الشخصية المعدل', 'تحليل قانوني شامل لمشروع قانون الأحوال الشخصية المعدل ومقارنته بالتشريعات الإقليمية', 4, 'أ. سارة عبدالرحمن', 'اللجنة القانونية', 'legislative', '07701234568', 'sara@parliament.iq', 'assigned', 'legal', '2024-01-18', '2024-02-18'),
('REQ-003', 'تقرير حول واقع قطاع النفط والغاز', 'إعداد تقرير مفصل حول واقع قطاع النفط والغاز في العراق والتحديات المستقبلية', 5, 'د. أحمد الجبوري', 'لجنة النفط والطاقة', 'oversight', '07701234569', 'ahmed.j@parliament.iq', 'completed', 'scientific', '2024-01-10', '2024-02-10'),
('REQ-004', 'دراسة حول الوضع الصحي في المحافظات', 'دراسة ميدانية حول واقع الخدمات الصحية في المحافظات العراقية', 6, 'أ. فاطمة الموسوي', 'لجنة الصحة والبيئة', 'oversight', '07701234570', 'fatima@parliament.iq', 'pending', NULL, '2024-01-25', '2024-03-01'),
('REQ-005', 'ورقة إحاطة حول إصلاح المناهج الدراسية', 'إعداد ورقة إحاطة حول خطة إصلاح المناهج الدراسية وتأثيرها على جودة التعليم', 7, 'د. عمر المالكي', 'لجنة التعليم', 'legislative', '07701234571', 'omar@parliament.iq', 'review', 'social', '2024-01-20', '2024-02-20'),
('REQ-006', 'بيان رأي حول الاتفاقيات التجارية الدولية', 'بيان رأي قانوني حول الاتفاقيات التجارية الدولية التي وقعها العراق مؤخراً', 3, 'د. خالد العبيدي', 'اللجنة المالية', 'oversight', '07701234567', 'khaled@parliament.iq', 'in_progress', 'political', '2024-01-22', '2024-02-22'),
('REQ-007', 'دراسة مقارنة حول قوانين مكافحة الفساد', 'دراسة مقارنة لقوانين مكافحة الفساد في الدول العربية وتقييم الإطار القانوني العراقي', 4, 'أ. سارة عبدالرحمن', 'اللجنة القانونية', 'legislative', '07701234568', 'sara@parliament.iq', 'confirmed', 'legal', '2024-01-24', '2024-03-01');

-- =============================================
-- تأكيدات الطلبات - Request Confirmations
-- =============================================
INSERT OR IGNORE INTO request_confirmations (request_id, service_type, classification, completion_days, confirmed_by) VALUES
('REQ-001', 'دراسة', 'مالية واقتصادية', 30, 8),
('REQ-003', 'تقرير', 'علمي', 25, 12),
('REQ-005', 'ورقة إحاطة', 'اجتماعي', 20, 11),
('REQ-006', 'بيان رأي', 'سياسي', 15, 9),
('REQ-007', 'دراسة', 'قانوني', 35, 10);

-- =============================================
-- مهام البحث - Research Tasks
-- =============================================
INSERT OR IGNORE INTO research_tasks (id, request_id, researcher_id, status, date_assigned, deadline, completion_days) VALUES
('RT-001', 'REQ-001', 13, 'in_progress', '2024-01-17', '2024-02-15', 30),
('RT-002', 'REQ-003', 17, 'completed', '2024-01-12', '2024-02-10', 25),
('RT-003', 'REQ-005', 16, 'sent_to_proofreader', '2024-01-22', '2024-02-20', 20),
('RT-004', 'REQ-006', 15, 'in_progress', '2024-01-24', '2024-02-22', 15);

-- =============================================
-- طلبات المعلومات - Information Requests
-- =============================================
INSERT OR IGNORE INTO information_requests (research_task_id, number, target_entity, subject, status, date_sent) VALUES
('RT-001', 'INF-001', 'وزارة المالية', 'بيانات الموازنة العامة 2020-2024', 'received', '2024-01-19'),
('RT-001', 'INF-002', 'البنك المركزي العراقي', 'تقارير التضخم الشهرية', 'sent', '2024-01-20'),
('RT-002', 'INF-001', 'وزارة النفط', 'إحصائيات الإنتاج والتصدير', 'received', '2024-01-14'),
('RT-004', 'INF-001', 'وزارة التجارة', 'نصوص الاتفاقيات التجارية الأخيرة', 'pending', '2024-01-26');

-- =============================================
-- مهام التدقيق - Proofreading Tasks
-- =============================================
INSERT OR IGNORE INTO proofreading_tasks (id, research_task_id, proofreader_id, status, assigned_date) VALUES
('PT-001', 'RT-002', 18, 'completed', '2024-02-05'),
('PT-002', 'RT-003', 19, 'in_progress', '2024-02-15');

-- =============================================
-- الملاحظات - Notes
-- =============================================
INSERT OR IGNORE INTO notes (entity_type, entity_id, user_id, user_name, content, created_at) VALUES
('request', 'REQ-001', 2, 'مدير النظام', 'تمت إحالة الطلب إلى قسم البحوث المالية والاقتصادية', '2024-01-16 10:00:00'),
('request', 'REQ-001', 8, 'د. سعاد العلوي', 'تم تأكيد الطلب وتعيين الباحث د. نور الدين', '2024-01-17 09:00:00'),
('research_task', 'RT-001', 13, 'د. نور الدين', 'تم البدء بجمع البيانات من وزارة المالية', '2024-01-18 11:00:00'),
('request', 'REQ-003', 12, 'د. كريم الجبوري', 'تم إنجاز البحث بنجاح وتسليمه للتدقيق', '2024-02-04 14:00:00'),
('proofreading_task', 'PT-001', 18, 'أ. محمد الخطاط', 'تم التدقيق اللغوي والمراجعة النهائية', '2024-02-08 16:00:00');

-- =============================================
-- سجل النشاطات - Activity Logs
-- =============================================
INSERT OR IGNORE INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details, created_at) VALUES
(3, 'د. خالد العبيدي', 'create_request', 'request', 'REQ-001', 'تقديم طلب بحثي جديد', '2024-01-15 08:30:00'),
(2, 'مدير النظام', 'assign_request', 'request', 'REQ-001', 'إحالة الطلب إلى قسم البحوث المالية', '2024-01-16 10:00:00'),
(8, 'د. سعاد العلوي', 'confirm_request', 'request', 'REQ-001', 'تأكيد الطلب وتعيين باحث', '2024-01-17 09:00:00'),
(13, 'د. نور الدين', 'start_research', 'research_task', 'RT-001', 'بدء العمل على البحث', '2024-01-18 11:00:00'),
(5, 'د. أحمد الجبوري', 'create_request', 'request', 'REQ-003', 'تقديم طلب بحثي جديد', '2024-01-10 09:00:00'),
(17, 'أ. مصطفى جواد', 'complete_research', 'research_task', 'RT-002', 'تسليم البحث المكتمل', '2024-02-04 14:00:00'),
(18, 'أ. محمد الخطاط', 'complete_proofreading', 'proofreading_task', 'PT-001', 'إتمام التدقيق اللغوي', '2024-02-08 16:00:00'),
(1, 'مدير النظام', 'system_login', NULL, NULL, 'تسجيل دخول مدير النظام', '2024-01-27 08:00:00');

-- =============================================
-- الإشعارات - Notifications
-- =============================================
INSERT OR IGNORE INTO notifications (user_id, title, message, type, is_read, entity_type, entity_id) VALUES
(3, 'تم إحالة طلبك', 'تمت إحالة طلبك REQ-001 إلى قسم البحوث المالية والاقتصادية', 'info', 1, 'request', 'REQ-001'),
(13, 'مهمة بحثية جديدة', 'تم تعيينك للعمل على البحث المتعلق بالسياسات المالية', 'info', 1, 'research_task', 'RT-001'),
(4, 'تم استلام طلبك', 'تم استلام طلبك REQ-002 وسيتم مراجعته قريباً', 'success', 0, 'request', 'REQ-002'),
(18, 'مهمة تدقيق جديدة', 'تم تعيينك لتدقيق بحث حول إصلاح المناهج الدراسية', 'info', 0, 'proofreading_task', 'PT-002'),
(5, 'تم إنجاز طلبك', 'تم إنجاز البحث المتعلق بطلبك REQ-003 بنجاح', 'success', 1, 'request', 'REQ-003');
