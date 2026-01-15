# Module 6: Reports - Implementation Briefing

**Date:** January 15, 2026  
**Module:** Reports (Generate and Download Attendance Reports)  
**Status:** Backend 100% Complete ✅ | Frontend 0% (To be implemented)

---

## 📋 Executive Summary

Module 6 implements a comprehensive **Report Generation System** that allows admins, teachers, and students to generate and download attendance reports in CSV format (PDF planned for future). The system supports two report types:
1. **Student Reports** - Individual student attendance records
2. **Class Reports** - Entire class statistics and breakdowns

The backend is **fully implemented and tested** with sophisticated permission controls, date range filtering, and file management.

---

## 🎯 Module Objectives

### Primary Goals
1. Allow users to generate attendance reports for custom date ranges
2. Support both student-level and class-level reports
3. Provide CSV download functionality
4. Maintain report history with metadata
5. Enforce role-based permissions

### User Stories
- **As an Admin**, I can generate reports for any student or class
- **As a Teacher**, I can generate reports for my classes and enrolled students
- **As a Student**, I can generate reports for my own attendance
- **As any user**, I can view my previously generated reports
- **As any user**, I can download completed reports in CSV format

---

## 🔧 Backend Implementation Analysis

### ✅ Complete Backend Features

#### 1. **Data Model** (`models.py`)

**Report Model:**
```python
Report {
    id: UUID (primary key)
    report_type: CHOICE ['STUDENT', 'CLASS']
    format: CHOICE ['CSV', 'PDF']  # PDF not yet implemented
    status: CHOICE ['PENDING', 'COMPLETED', 'FAILED']
    
    # Filters
    class_instance: FK to Class (nullable)
    student: FK to Student (nullable)
    start_date: DateField
    end_date: DateField
    
    # File storage
    file_path: String (500 chars)
    file_size: Integer (bytes)
    
    # Metadata
    generated_by: FK to User
    error_message: TextField (nullable)
    created_at: DateTime (auto)
    completed_at: DateTime (nullable)
}
```

**Business Rules:**
- Student reports require `student` field
- Class reports require `class_instance` field
- `start_date` must be ≤ `end_date`
- Teachers can only generate reports for their own classes
- Students can only generate their own reports
- Admins can generate any report

#### 2. **API Endpoints** (`urls.py`)

```
POST   /api/reports/generate/              # Generate new report
GET    /api/reports/                       # List user's reports
GET    /api/reports/{id}/download/         # Download report file
```

#### 3. **Report Generation Service** (`services.py`)

**ReportGenerationService:**
- `generate_student_report(student_id, start_date, end_date, format)`
  - Fetches attendance records for student in date range
  - Generates CSV with columns: Date, Time, Class, Subject, Status, Marked By
  - Returns: `{file_path, file_size, records_count}`

- `generate_class_report(class_id, start_date, end_date, format)`
  - Fetches all enrolled students
  - Fetches all sessions in date range
  - Calculates per-student statistics (present/absent/late/rate)
  - Generates CSV with student-by-student breakdown
  - Returns: `{file_path, file_size, records_count}`

**CSV Formats:**

**Student Report CSV:**
```csv
Student Name,Student Email,Session Date,Session Time,Class,Subject,Status,Marked By,Marked At
John Doe,john@example.com,2026-01-10,09:00,Math 101,Mathematics,PRESENT,Dr. Smith,2026-01-10 09:05
John Doe,john@example.com,2026-01-11,09:00,Math 101,Mathematics,ABSENT,Dr. Smith,2026-01-11 09:10
...
```

**Class Report CSV:**
```csv
Class Attendance Report: Math 101
Period: 2026-01-01 to 2026-01-15
Total Sessions in Period: 12

Student ID,Student Name,Email,Sessions Marked,Present,Absent,Late,Attendance Rate (%)
STU001,John Doe,john@example.com,12,10,2,0,83.33
STU002,Jane Smith,jane@example.com,12,12,0,0,100.00
...
```

#### 4. **Permissions** (`permissions.py`)

**CanGenerateReport:**
- ADMIN: ✅ Any report
- TEACHER: ✅ Own classes and students only
- STUDENT: ✅ Own reports only

**CanDownloadReport:**
- Same rules as CanGenerateReport
- Must have access to the report entity
- Report must be COMPLETED status

#### 5. **Serializers** (`serializers.py`)

**ReportRequestSerializer:**
- Validates: `report_type`, `class_id`, `student_id`, `start_date`, `end_date`, `format`
- Ensures student_id for student reports, class_id for class reports
- Validates date range
- Rejects PDF format (not implemented)

**ReportResponseSerializer:**
- Returns full report details with metadata
- Includes `download_url` if completed
- Shows `class_name`, `student_name`, `generated_by_name`

**ReportListSerializer:**
- Simplified version for listing reports
- Shows basic info: type, status, dates, names

#### 6. **Views** (`views.py`)

**GenerateReportView (POST /api/reports/generate/):**
1. Validates request data
2. Checks user permissions based on report type
3. Creates Report record with PENDING status
4. Calls ReportGenerationService (synchronous for now)
5. Updates report with file path and COMPLETED status
6. Returns report metadata with download URL

**DownloadReportView (GET /api/reports/{id}/download/):**
1. Fetches report by ID
2. Checks user permissions
3. Validates report status (must be COMPLETED)
4. Checks file existence
5. Returns FileResponse with proper filename and content-type

**ListReportsView (GET /api/reports/):**
1. Filters reports based on user role:
   - ADMIN: All reports
   - TEACHER: Reports generated by them
   - STUDENT: Reports for their student profile
2. Returns list with ReportListSerializer

---

## 📊 API Request/Response Examples

### 1. Generate Student Report

**Request:**
```http
POST /api/reports/generate/
Content-Type: application/json
Authorization: Bearer <token>

{
  "report_type": "student",
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "format": "csv"
}
```

**Response (201 Created):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "report_type": "STUDENT",
  "format": "CSV",
  "status": "COMPLETED",
  "class_id": null,
  "class_name": null,
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "student_name": "John Doe",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "file_size": 2048,
  "generated_by_name": "Dr. Jane Smith",
  "download_url": "/api/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download/",
  "created_at": "2026-01-15T10:30:00Z",
  "completed_at": "2026-01-15T10:30:02Z",
  "error_message": null
}
```

### 2. Generate Class Report

**Request:**
```http
POST /api/reports/generate/
Content-Type: application/json
Authorization: Bearer <token>

{
  "report_type": "class",
  "class_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "format": "csv"
}
```

**Response (201 Created):**
```json
{
  "id": "d4e5f6a7-b8c9-0123-defg-h45678901234",
  "report_type": "CLASS",
  "format": "CSV",
  "status": "COMPLETED",
  "class_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "class_name": "Math 101",
  "student_id": null,
  "student_name": null,
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "file_size": 4096,
  "generated_by_name": "Dr. Jane Smith",
  "download_url": "/api/reports/d4e5f6a7-b8c9-0123-defg-h45678901234/download/",
  "created_at": "2026-01-15T10:35:00Z",
  "completed_at": "2026-01-15T10:35:03Z",
  "error_message": null
}
```

### 3. List Reports

**Request:**
```http
GET /api/reports/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "report_type": "STUDENT",
    "format": "CSV",
    "status": "COMPLETED",
    "class_name": null,
    "student_name": "John Doe",
    "start_date": "2026-01-01",
    "end_date": "2026-01-31",
    "created_at": "2026-01-15T10:30:00Z"
  },
  {
    "id": "d4e5f6a7-b8c9-0123-defg-h45678901234",
    "report_type": "CLASS",
    "format": "CSV",
    "status": "COMPLETED",
    "class_name": "Math 101",
    "student_name": null,
    "start_date": "2026-01-01",
    "end_date": "2026-01-31",
    "created_at": "2026-01-15T10:35:00Z"
  }
]
```

### 4. Download Report

**Request:**
```http
GET /api/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download/
Authorization: Bearer <token>
```

**Response (200 OK):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="student_report_John_Doe_2026-01-01_to_2026-01-31.csv"

[CSV file content]
```

---

## 🎨 Frontend Requirements

### Pages to Build

#### 1. **GenerateReport.jsx** (`/reports/generate`)

**Purpose:** Allow users to create new reports

**UI Components:**
- **Report Type Selector**
  - Radio buttons: "Student Report" vs "Class Report"
  - Icon for each type
  
- **Target Selector** (conditional)
  - If Student Report: Dropdown to select student
  - If Class Report: Dropdown to select class
  
- **Date Range Picker**
  - Start Date input (calendar)
  - End Date input (calendar)
  - Validation: start ≤ end
  - Quick presets: "This Week", "This Month", "Last 30 Days", "Custom"
  
- **Format Selector**
  - Radio buttons: CSV (enabled), PDF (disabled/grayed)
  - Tooltip: "PDF format coming soon"
  
- **Generate Button**
  - Primary action button
  - Shows loading spinner during generation
  - Disabled if form invalid
  
- **Generated Report Display**
  - Success message with download button
  - Shows: Report type, date range, file size, created at
  - "Download CSV" button
  - "Generate Another Report" button

**Features:**
- Form validation before submission
- Loading state during generation
- Success/error notifications
- Automatic download on completion (optional)
- Redirect to ViewReports after success (optional)

**Permissions:**
- ADMIN: Can select any student/class
- TEACHER: Can only see own classes and students
- STUDENT: Auto-select own student ID (no dropdown)

#### 2. **ViewReports.jsx** (`/reports/view`)

**Purpose:** View and download previously generated reports

**UI Components:**
- **Reports List/Table**
  - Columns: Report Type, Target (Student/Class), Date Range, Status, Created At, Actions
  - Sortable by date
  - Filterable by type and status
  - Color-coded status badges (COMPLETED=green, PENDING=yellow, FAILED=red)
  
- **Action Buttons per Report**
  - Download button (if COMPLETED)
  - Delete button (optional)
  - View details button
  
- **Empty State**
  - Message: "No reports generated yet"
  - Call-to-action: "Generate Your First Report" button
  
- **Loading State**
  - Skeleton loaders for table rows
  
- **Pagination** (if many reports)
  - Show 10-20 reports per page

**Features:**
- Auto-refresh status every 5 seconds for PENDING reports
- Search/filter by student name, class name
- Date range filter
- Download directly from table
- Responsive table (scroll on mobile)

---

## 🛠️ Frontend Implementation Plan

### API Service Layer

**File:** `frontend/src/api/reportsService.js`

```javascript
export const reportsService = {
  // Generate new report
  generateReport(data) {
    // POST /api/reports/generate/
    // data: { report_type, student_id/class_id, start_date, end_date, format }
  },
  
  // List user's reports
  listReports() {
    // GET /api/reports/
  },
  
  // Download report
  downloadReport(reportId) {
    // GET /api/reports/{id}/download/
    // Returns blob for file download
  }
}
```

### Component Structure

```
pages/
├── GenerateReport.jsx         # Main report generation page
│   ├── ReportTypeSelector     # Radio: Student vs Class
│   ├── TargetSelector         # Dropdown for student/class
│   ├── DateRangePicker        # Start/end date inputs
│   ├── FormatSelector         # CSV/PDF radio buttons
│   └── GeneratedReportCard    # Shows result after generation
│
└── ViewReports.jsx            # Reports history page
    ├── ReportsTable           # Table of all reports
    ├── ReportRow              # Single report row
    ├── StatusBadge            # Colored status indicator
    └── EmptyState             # No reports message

components/
├── DatePicker.jsx             # Reusable date input (or use library)
└── FileDownloadButton.jsx     # Download button with loading state
```

### State Management

**GenerateReport.jsx:**
```javascript
const [reportType, setReportType] = useState('student');
const [selectedStudentId, setSelectedStudentId] = useState('');
const [selectedClassId, setSelectedClassId] = useState('');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [format, setFormat] = useState('csv');
const [loading, setLoading] = useState(false);
const [generatedReport, setGeneratedReport] = useState(null);
const [error, setError] = useState(null);
const [students, setStudents] = useState([]);
const [classes, setClasses] = useState([]);
```

**ViewReports.jsx:**
```javascript
const [reports, setReports] = useState([]);
const [loading, setLoading] = useState(true);
const [filter, setFilter] = useState('all'); // all, student, class
const [statusFilter, setStatusFilter] = useState('all');
const [searchQuery, setSearchQuery] = useState('');
```

### Data Flow

```
User Action → Component State → API Call → Backend Processing → Response → Update State → UI Update → File Download
```

**Example: Generate Student Report**
```
1. User selects "Student Report"
2. User selects student from dropdown
3. User picks date range (Jan 1 - Jan 31)
4. User clicks "Generate Report"
5. Frontend sends POST /api/reports/generate/
6. Backend creates Report record, generates CSV
7. Backend returns report metadata with download_url
8. Frontend shows success message with download button
9. User clicks "Download CSV"
10. Frontend sends GET /api/reports/{id}/download/
11. Backend sends CSV file
12. Browser downloads file
```

---

## 🎨 UI/UX Design Guidelines

### Color Coding
- **COMPLETED reports**: Green badge (bg-green-100, text-green-800)
- **PENDING reports**: Yellow badge (bg-yellow-100, text-yellow-800)
- **FAILED reports**: Red badge (bg-red-100, text-red-800)

### Icons
- Student Report: 👤 or 📄
- Class Report: 📚 or 📊
- Download: ⬇️ or 💾
- Calendar: 📅
- CSV File: 📊

### Form Validation
- Highlight required fields in red if empty
- Show error message under invalid fields
- Disable submit button if form invalid
- Show inline validation on blur

### Loading States
- Show spinner on "Generate Report" button
- Show skeleton loaders in ViewReports table
- Show "Generating..." text during processing
- Disable form inputs during submission

### Success/Error Messages
- Success: Green toast/banner "Report generated successfully!"
- Error: Red toast/banner "Failed to generate report: {error}"
- Info: Blue toast "Your report is being generated..."

### Date Picker UX
- Default to last 30 days
- Quick presets for common ranges
- Prevent selecting future dates
- Show selected range clearly

---

## 🔐 Permission Handling

### Frontend Permission Checks

**For GenerateReport.jsx:**
```javascript
if (user.hasRole('ADMIN')) {
  // Show all students and classes in dropdowns
} else if (user.hasRole('TEACHER')) {
  // Show only own classes and enrolled students
} else if (user.hasRole('STUDENT')) {
  // Hide dropdowns, auto-select own student ID
  // Show only student report option (hide class report)
}
```

**For ViewReports.jsx:**
```javascript
// No special filtering needed - backend filters by user role
// Just display whatever reports the API returns
```

---

## ✅ Testing Checklist

### Functional Tests
- [ ] Generate student report with valid data
- [ ] Generate class report with valid data
- [ ] Validate date range (start ≤ end)
- [ ] Validate required fields (student_id, class_id)
- [ ] Handle form validation errors
- [ ] Display success message on completion
- [ ] Download CSV file
- [ ] View list of reports
- [ ] Filter reports by type
- [ ] Filter reports by status
- [ ] Search reports by name
- [ ] Handle API errors gracefully
- [ ] Show loading states correctly

### Permission Tests
- [ ] ADMIN can generate any report
- [ ] TEACHER sees only own classes
- [ ] TEACHER sees only enrolled students
- [ ] STUDENT sees only own reports
- [ ] Student cannot generate class reports
- [ ] Unauthorized access redirects/errors

### Edge Cases
- [ ] No students enrolled in class
- [ ] No sessions in date range (generates empty CSV)
- [ ] Date range in future (should warn or prevent)
- [ ] Very large date range (performance)
- [ ] Report generation failure (show error)
- [ ] Download failed/deleted file (404 handling)
- [ ] Pending report (disable download, show status)

### UI/UX Tests
- [ ] Date picker works on all browsers
- [ ] Form responsive on mobile
- [ ] Table scrollable on mobile
- [ ] Loading spinners show correctly
- [ ] Success/error messages appear
- [ ] Icons render properly
- [ ] Status badges color-coded
- [ ] File downloads with correct filename

---

## 📦 Third-Party Libraries Needed

### Date Picker Options
1. **react-datepicker** (Recommended)
   - Lightweight, customizable
   - `npm install react-datepicker`
   
2. **@mui/x-date-pickers** (Material-UI)
   - More feature-rich
   - Requires Material-UI setup
   
3. **Native HTML5** `<input type="date">`
   - No library needed
   - Limited styling options

### File Download
- No library needed
- Use browser native download: `window.location.href = downloadUrl`
- Or Axios with `responseType: 'blob'`

---

## 🚀 Implementation Steps

### Step 1: API Service Layer
1. Create `reportsService.js`
2. Implement 3 methods: generate, list, download
3. Test API calls in console

### Step 2: GenerateReport Page
1. Create page structure
2. Add report type selector
3. Add target selector (student/class dropdown)
4. Add date range picker
5. Add format selector
6. Implement form validation
7. Implement generate report logic
8. Display success/error messages
9. Add download functionality

### Step 3: ViewReports Page
1. Create page structure
2. Fetch reports list
3. Display reports table
4. Add status badges
5. Add download buttons
6. Implement search/filter
7. Add empty state
8. Add loading states

### Step 4: Routes & Navigation
1. Add routes: `/reports/generate`, `/reports/view`
2. Add dashboard cards for both pages
3. Add navigation between pages

### Step 5: Testing
1. Test all user flows
2. Test permissions
3. Test edge cases
4. Test responsive design

---

## 📊 Expected Outcomes

After Module 6 implementation:
- ✅ Users can generate custom attendance reports
- ✅ Users can download reports in CSV format
- ✅ Users can view report history
- ✅ Permission-based access enforced
- ✅ Date range filtering works
- ✅ Both student and class reports functional
- ✅ Clean, intuitive UI

---

## 🔄 Future Enhancements (Post-Module 6)

- [ ] PDF report generation
- [ ] Scheduled/recurring reports
- [ ] Email reports to users
- [ ] Report templates
- [ ] Custom column selection
- [ ] Charts/graphs in reports
- [ ] Export to Excel
- [ ] Report sharing
- [ ] Bulk report generation
- [ ] Asynchronous generation (for large reports)

---

## 📝 Notes

- Backend is **100% complete and tested**
- CSV generation is synchronous (fast enough for now)
- PDF format infrastructure exists but not implemented
- Files stored in `backend/media/reports/` directory
- Report metadata persists in database
- Old reports can be cleaned up manually (no auto-delete)

---

## ✅ Backend Status: COMPLETE ✅

**Next Step:** Implement frontend pages and integrate with backend APIs.

---

**End of Briefing**
