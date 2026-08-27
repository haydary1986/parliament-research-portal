package models

import "time"

// =============================================
// المستخدم - User
// =============================================
type User struct {
	ID             int        `json:"id"`
	Name           string     `json:"name"`
	Email          string     `json:"email"`
	PasswordHash   string     `json:"-"`
	Role           string     `json:"role"`
	DepartmentID   *string    `json:"department_id"`
	DeputyID       *string    `json:"deputy_id"`
	RequesterType  *string    `json:"requester_type"`       // نوع الجهة الطالبة (للأدوار الطالبة)
	Committee      *string    `json:"committee"`            // اللجنة الرئيسية (للتوافق مع القديم)
	Committees     []string   `json:"committees,omitempty"` // قائمة كل لجان النائب
	Phone          *string    `json:"phone"`
	Specialization *string    `json:"specialization"`
	Status         string     `json:"status"`
	LastLogin      *time.Time `json:"last_login"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	Permissions    []string   `json:"permissions,omitempty"`
}

// BulkUserInput يستخدم لإنشاء عدة حسابات نواب دفعة واحدة
type BulkUserInput struct {
	Users []BulkUserRow `json:"users"`
}

type BulkUserRow struct {
	Name          string   `json:"name"`
	Email         string   `json:"email"`          // اختياري - يُولَّد تلقائياً من الاسم
	Phone         string   `json:"phone"`          // اختياري
	Role          string   `json:"role"`           // افتراضي "deputy"
	RequesterType string   `json:"requester_type"` // افتراضي "deputy"
	Committees    []string `json:"committees"`     // قائمة اللجان
	DeputyID      string   `json:"deputy_id"`      // اختياري
}

type BulkUserResult struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password,omitempty"` // كلمة المرور المولَّدة
	Success  bool   `json:"success"`
	Error    string `json:"error,omitempty"`
	UserID   int    `json:"user_id,omitempty"`
}

// =============================================
// القسم - Department
// =============================================
type Department struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	HeadName        string `json:"head_name"`
	ResearcherCount int    `json:"researcher_count"`
	ActiveRequests  int    `json:"active_requests"`
	Color           string `json:"color"`
}

// =============================================
// الطلب - Request
// =============================================
type Request struct {
	ID                    string               `json:"id"`
	Title                 string               `json:"title"`
	Description           *string              `json:"description"`
	DeputyID              *int                 `json:"deputy_id"`
	DeputyName            *string              `json:"deputy_name"`
	Committee             *string              `json:"committee"`
	Purpose               *string              `json:"purpose"`
	Phone                 *string              `json:"phone"`
	Email                 *string              `json:"email"`
	Status                string               `json:"status"`
	AssignedDepartment    *string              `json:"assigned_department"`
	AssignedDepartments   []string             `json:"assigned_departments,omitempty"` // قائمة كاملة من جدول request_departments
	CanShare              int                  `json:"can_share"`                      // موافقة النائب على نشر البحث
	Confidentiality       string               `json:"confidentiality"`                // 'public' | 'confidential'
	RequesterType         *string              `json:"requester_type"`                 // نوع الجهة الطالبة
	DateReceived          time.Time            `json:"date_received"`
	Deadline              *time.Time           `json:"deadline"`
	ReferralDate          *time.Time           `json:"referral_date"`
	CompletedDate         *time.Time           `json:"completed_date"`
	ExistingResearchID    *string              `json:"existing_research_id"`
	DeliveredToDeputyDate *time.Time           `json:"delivered_to_deputy_date"`
	Archived              int                  `json:"archived"`
	ArchivedDate          *time.Time           `json:"archived_date"`
	FinalReviewBy         *int                 `json:"final_review_by"`
	FinalReviewDate       *time.Time           `json:"final_review_date"`
	AssistantReviewBy     *int                 `json:"assistant_review_by"`
	AssistantReviewDate   *time.Time           `json:"assistant_review_date"`
	CreatedAt             time.Time            `json:"created_at"`
	UpdatedAt             time.Time            `json:"updated_at"`
	Confirmation          *RequestConfirmation `json:"confirmation,omitempty"`
	Notes                 []Note               `json:"notes,omitempty"`
	// عدد كتب المخاطبات الرسمية — يُستخدم لإظهار مرحلة «إجراء مخاطبات رسمية» للطالب
	OfficialLettersCount int `json:"official_letters_count"`
	// ملفات البحث المرفوعة — تُتاح لكل من يحق له قراءة الطلب
	// (الجهة الطالبة، فريق القسم، المدقق، المعاون، الإدارة)
	Files []RequestFile `json:"files,omitempty"`
}

// RequestFile ملف بحث مرفوع مرتبط بمهمة
type RequestFile struct {
	TaskID         string     `json:"task_id"`
	ResearcherID   int        `json:"researcher_id"`
	ResearcherName string     `json:"researcher_name"`
	FilePath       string     `json:"file_path"`
	TaskStatus     string     `json:"task_status"`
	SubmittedDate  *time.Time `json:"submitted_date"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// =============================================
// تأكيد الطلب - Request Confirmation
// =============================================
type RequestConfirmation struct {
	ID             int       `json:"id"`
	RequestID      string    `json:"request_id"`
	ServiceType    string    `json:"service_type"`
	Classification string    `json:"classification"`
	CompletionDays int       `json:"completion_days"`
	ConfirmedBy    int       `json:"confirmed_by"`
	ConfirmedAt    time.Time `json:"confirmed_at"`
}

// =============================================
// مهمة البحث - Research Task
// =============================================
type ResearchTask struct {
	ID                  string               `json:"id"`
	RequestID           string               `json:"request_id"`
	ResearcherID        int                  `json:"researcher_id"`
	Status              string               `json:"status"`
	FilePath            *string              `json:"file_path"`
	DateAssigned        time.Time            `json:"date_assigned"`
	Deadline            *time.Time           `json:"deadline"`
	CompletionDays      *int                 `json:"completion_days"`
	SubmittedDate       *time.Time           `json:"submitted_date"`
	ArchiveConsent      *string              `json:"archive_consent"`
	ArchiveConsentDate  *time.Time           `json:"archive_consent_date"`
	ArchiveConsentNotes *string              `json:"archive_consent_notes"`
	CreatedAt           time.Time            `json:"created_at"`
	UpdatedAt           time.Time            `json:"updated_at"`
	InformationRequests []InformationRequest `json:"information_requests,omitempty"`
	Notes               []Note               `json:"notes,omitempty"`
}

// =============================================
// طلب معلومات - Information Request
// =============================================
type InformationRequest struct {
	ID                   int        `json:"id"`
	ResearchTaskID       string     `json:"research_task_id"`
	Number               string     `json:"number"`
	TargetEntity         string     `json:"target_entity"`
	Subject              string     `json:"subject"`
	Status               string     `json:"status"`
	AttachedFile         *string    `json:"attached_file"`
	DateSent             time.Time  `json:"date_sent"`
	AttemptNumber        int        `json:"attempt_number"`
	ResponseLetterNumber *string    `json:"response_letter_number"`
	ResponseDate         *time.Time `json:"response_date"`
}

// =============================================
// مهمة التدقيق - Proofreading Task
// =============================================
type ProofreadingTask struct {
	ID             string     `json:"id"`
	ResearchTaskID string     `json:"research_task_id"`
	ProofreaderID  int        `json:"proofreader_id"`
	Status         string     `json:"status"`
	Notes          *string    `json:"notes"`
	FilePath       *string    `json:"file_path"`
	AssignedDate   time.Time  `json:"assigned_date"`
	CompletedDate  *time.Time `json:"completed_date"`
}

// =============================================
// ملاحظة - Note
// =============================================
type Note struct {
	ID         int       `json:"id"`
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	UserID     *int      `json:"user_id"`
	UserName   string    `json:"user_name"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

// =============================================
// سجل النشاط - Activity Log
// =============================================
type ActivityLog struct {
	ID         int       `json:"id"`
	UserID     *int      `json:"user_id"`
	UserName   string    `json:"user_name"`
	Action     string    `json:"action"`
	EntityType *string   `json:"entity_type"`
	EntityID   *string   `json:"entity_id"`
	Details    *string   `json:"details"`
	IPAddress  *string   `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
}

// =============================================
// إشعار - Notification
// =============================================
type Notification struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	Title      string    `json:"title"`
	Message    string    `json:"message"`
	Type       string    `json:"type"`
	IsRead     bool      `json:"is_read"`
	EntityType *string   `json:"entity_type"`
	EntityID   *string   `json:"entity_id"`
	CreatedAt  time.Time `json:"created_at"`
}

// =============================================
// طلبات API - API Request/Response types
// =============================================
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateRequestInput struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	Purpose         string `json:"purpose"`
	Committee       string `json:"committee"`
	CanShare        bool   `json:"can_share"`       // موافقة النائب على نشر البحث
	Confidentiality string `json:"confidentiality"` // 'public' | 'confidential' — يحدده الطالب
}

// UpdateRequestInput تعديل بيانات الطلب من مدير الدائرة
type UpdateRequestInput struct {
	Title           string  `json:"title"`
	Description     string  `json:"description"`
	Purpose         string  `json:"purpose"`
	Committee       string  `json:"committee"`
	Deadline        *string `json:"deadline"` // ISO-8601 أو فارغ
	CanShare        *bool   `json:"can_share"`
	Confidentiality string  `json:"confidentiality"`
}

// AssignRequestInput يقبل قسماً واحداً أو قائمة (نقطة 1 من بوابة المدير)
// ويسمح لمدير الدائرة بتعيين الباحث/الباحثين مباشرة مع تفاصيل الإعداد
type AssignRequestInput struct {
	DepartmentID  string   `json:"department_id"`  // متوافق مع القديم
	DepartmentIDs []string `json:"department_ids"` // الإحالة لأكثر من قسم
	// تعيين مباشر من مدير الدائرة (اختياري — إن تُرك فارغاً يتولاه رئيس القسم)
	ResearcherIDs  []int  `json:"researcher_ids"`
	ServiceType    string `json:"service_type"`
	Classification string `json:"classification"`
	CompletionDays int    `json:"completion_days"`
}

// ConfirmRequestInput يقبل باحثاً واحداً أو قائمة (نقطة 1 من بوابة القسم)
type ConfirmRequestInput struct {
	ServiceType    string `json:"service_type"`
	Classification string `json:"classification"`
	CompletionDays int    `json:"completion_days"`
	ResearcherID   int    `json:"researcher_id"`  // متوافق مع القديم
	ResearcherIDs  []int  `json:"researcher_ids"` // تعيين باحثين متعددين
}

// CreateInfoRequestInput تفاصيل كتاب المخاطبة الرسمي
// رقم الكتاب وتاريخه اختياريان — يُولَّد رقم تلقائي ويُستخدم تاريخ اليوم عند غيابهما
type CreateInfoRequestInput struct {
	TargetEntity string `json:"target_entity"` // جهة المخاطبة
	Subject      string `json:"subject"`       // موضوع الكتاب
	Number       string `json:"number"`        // رقم الكتاب الصادر
	LetterDate   string `json:"letter_date"`   // تاريخ الكتاب (YYYY-MM-DD)
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

type PaginatedResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Total   int         `json:"total"`
	Page    int         `json:"page"`
	Limit   int         `json:"limit"`
}

type DashboardStats struct {
	TotalRequests     int `json:"total_requests"`
	PendingRequests   int `json:"pending_requests"`
	InProgressCount   int `json:"in_progress_count"`
	CompletedRequests int `json:"completed_requests"`
	TotalResearchers  int `json:"total_researchers"`
	TotalDepartments  int `json:"total_departments"`
}
