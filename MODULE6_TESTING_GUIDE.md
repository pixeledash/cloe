# Module 6: Reports - Testing Guide

## 🧪 How to Test Module 6

### Prerequisites
- Backend and frontend containers running (`docker-compose up`)
- User logged in (ADMIN, TEACHER, or STUDENT)
- At least 1 student with attendance records
- At least 1 class with sessions conducted

---

## Test Scenarios

### 1️⃣ Access Reports Pages

**From Dashboard:**
1. Log in to the application
2. Look for two new cards:
   - "Generate Report" (📊)
   - "View Reports" (📄)
3. Both cards should be visible to all roles (ADMIN/TEACHER/STUDENT)

**Expected Results:**
- ✅ Both cards appear on dashboard
- ✅ Clicking "Generate Report" → navigates to `/reports/generate`
- ✅ Clicking "View Reports" → navigates to `/reports/view`

---

### 2️⃣ Test Generate Report (ADMIN/TEACHER)

**Steps:**
1. Navigate to `/reports/generate`
2. Should see two report type cards: Student Report and Class Report

**Test Student Report:**
1. Click "Student Report" card (should highlight with purple border)
2. Select a student from dropdown
3. Try quick date presets:
   - Click "Last 7 Days" → dates should update
   - Click "Last 30 Days" → dates should update
   - Click "Last Month" → dates should update
4. Or manually select custom dates
5. Format should default to CSV (PDF grayed out)
6. Click "Generate Report" button

**Expected Results:**
- ✅ Report generates successfully
- ✅ Success message appears with green background
- ✅ Report details shown: Type, Target, Date Range, File Size, Status
- ✅ "Download Report" button visible
- ✅ Status shows "COMPLETED"

**Test Download:**
1. Click "Download Report" button
2. CSV file should download to browser

**Expected Results:**
- ✅ File downloads with proper filename (e.g., `student_report_John_Doe_2026-01-01_to_2026-01-31.csv`)
- ✅ File opens in Excel/Sheets
- ✅ Contains columns: Student Name, Email, Date, Time, Class, Subject, Status, Marked By, Marked At
- ✅ Data is accurate

**Test Class Report:**
1. Click "Generate Another Report"
2. Click "Class Report" card
3. Select a class from dropdown
4. Select date range
5. Click "Generate Report"

**Expected Results:**
- ✅ Class report generates
- ✅ Download works
- ✅ CSV contains: Header (class name, period, total sessions), then Student data
- ✅ Columns: Student ID, Name, Email, Sessions, Present, Absent, Late, Attendance Rate

---

### 3️⃣ Test Generate Report (STUDENT Role)

**Steps:**
1. Log in as a STUDENT
2. Navigate to `/reports/generate`

**Expected Results:**
- ✅ "Student Report" card is enabled
- ✅ "Class Report" card is disabled/grayed with text "Teachers and Admins only"
- ✅ Student dropdown is disabled (pre-filled with their own name)
- ✅ Can select date range
- ✅ Can generate their own report
- ✅ Cannot select other students
- ❌ Cannot generate class reports

---

### 4️⃣ Test Form Validation

**Test Required Fields:**
1. Try to submit without selecting student → Error: "Please select a student"
2. Try to submit without dates → Error: "Please select date range"

**Test Date Validation:**
1. Select start date: 2026-01-15
2. Select end date: 2026-01-10 (before start)
3. Click "Generate Report"
4. Expected: Error "Start date must be before or equal to end date"

**Test Future Dates:**
1. Try to select future dates in date picker
2. Expected: Date picker blocks future dates (max = today)

---

### 5️⃣ Test View Reports Page

**Steps:**
1. Navigate to `/reports/view`
2. Should see list of previously generated reports

**Expected Results (if reports exist):**
- ✅ Table shows all reports
- ✅ Columns: Type, Target, Date Range, Status, Created At, Actions
- ✅ Status badges color-coded:
  - Green for COMPLETED
  - Yellow for PENDING
  - Red for FAILED
- ✅ Download buttons appear for COMPLETED reports

**Test Filters:**
1. **Type Filter:**
   - Select "Student Reports" → only student reports shown
   - Select "Class Reports" → only class reports shown
   - Select "All Types" → all shown

2. **Status Filter:**
   - Select "Completed" → only completed shown
   - Select "Pending" → only pending shown
   - Select "All Status" → all shown

3. **Search:**
   - Type student name → filters to matching reports
   - Type class name → filters to matching reports
   - Clear search → all shown again

**Test Sorting:**
1. Click "Type" column header → sorts by type
2. Click again → reverses order (↑/↓ arrow shows direction)
3. Try clicking "Created" header → sorts by date
4. Try clicking "Date Range" header → sorts by start date

**Test Download:**
1. Find a COMPLETED report
2. Click "Download" button
3. Expected: CSV file downloads
4. File should match the report's data

---

### 6️⃣ Test Empty State

**Steps:**
1. Create a new user with no reports
2. Navigate to `/reports/view`

**Expected Results:**
- ✅ Shows large 📋 icon
- ✅ Message: "No Reports Found" or "You haven't generated any reports yet"
- ✅ Button: "Generate Your First Report"
- ✅ Clicking button navigates to `/reports/generate`

---

### 7️⃣ Test Responsive Design

**Desktop (1440px+):**
- ✅ Full table with all columns
- ✅ Form fields side-by-side
- ✅ Cards in grid layout

**Tablet (768px - 1024px):**
- ✅ Table still readable
- ✅ Some columns may scroll

**Mobile (< 768px):**
- ✅ Table switches to card layout
- ✅ Each report shows as a card
- ✅ Download button full-width
- ✅ Form fields stack vertically
- ✅ Date presets wrap nicely

---

### 8️⃣ Test User Flows

**Flow 1: Teacher generates class report for grading**
1. Teacher logs in
2. Clicks "Generate Report" from dashboard
3. Selects "Class Report"
4. Picks their class
5. Selects "Last Month" preset
6. Clicks "Generate Report"
7. Downloads CSV
8. Opens in Excel
9. Uses for grading ✅

**Flow 2: Student downloads attendance record**
1. Student logs in
2. Clicks "Generate Report"
3. Sees their name pre-selected
4. Picks "Last 3 Months" preset
5. Generates report
6. Downloads CSV
7. Reviews their attendance ✅

**Flow 3: Admin audits all reports**
1. Admin logs in
2. Clicks "View Reports"
3. Sees all reports from all users
4. Filters by "Class Reports"
5. Sorts by "Created" date
6. Downloads recent reports for audit ✅

---

### 9️⃣ Test Permission Enforcement

**ADMIN:**
- ✅ Can select any student
- ✅ Can select any class
- ✅ Can generate both types of reports
- ✅ Can view all reports in "View Reports"

**TEACHER:**
- ✅ Can select students enrolled in their classes
- ✅ Can select their own classes only
- ✅ Can generate both types (for their data)
- ✅ Can view only reports they generated

**STUDENT:**
- ✅ Can only select themselves (auto-selected)
- ❌ Cannot change student selection
- ❌ Cannot generate class reports
- ✅ Can view only their own student reports

---

### 🔟 Test Error Handling

**Network Error:**
1. Stop backend: `docker-compose stop backend`
2. Try to generate report
3. Expected: Error message "Failed to generate report"
4. Restart backend: `docker-compose start backend`

**Invalid Student ID:**
1. Manually navigate to generate page with invalid student ID in URL
2. Expected: Dropdown shows empty or error

**Backend Validation Error:**
1. Try to generate report with invalid data (e.g., via API directly)
2. Expected: Error message from backend displayed

---

## ✅ Success Criteria

Module 6 is fully functional if:

✅ Generate Report page loads without errors  
✅ Both report types can be generated  
✅ Date range picker works correctly  
✅ Form validation catches errors  
✅ Reports generate successfully  
✅ CSV files download correctly  
✅ CSV data is accurate and complete  
✅ View Reports page shows all reports  
✅ Filters work (type, status, search)  
✅ Sorting works (all columns)  
✅ Status badges display correctly  
✅ Download buttons work  
✅ Permissions enforce correctly  
✅ Responsive design works on all devices  
✅ Loading states appear during operations  
✅ Error messages clear and helpful  
✅ Empty states display when no reports  

---

## 🐛 Common Issues & Fixes

### Issue: "No students available"
**Cause:** No students created or enrolled  
**Fix:** Create students and enroll in classes

### Issue: CSV is empty
**Cause:** No attendance records in date range  
**Fix:** Select a date range that includes sessions with attendance

### Issue: Cannot download report
**Cause:** Report status is PENDING or FAILED  
**Fix:** Wait for COMPLETED status, or regenerate if FAILED

### Issue: Class report option disabled for student
**Cause:** Working as intended  
**Fix:** None needed - students cannot generate class reports

### Issue: Dropdown is empty
**Cause:** User has no access to any students/classes  
**Fix:** 
- TEACHER: Create classes and enroll students
- STUDENT: Contact admin to create student profile

---

## 📊 Test Data Requirements

For comprehensive testing, ensure you have:

**Minimum:**
- 1 ADMIN user
- 1 TEACHER user with at least 1 class
- 1 STUDENT user with attendance records
- 3+ students enrolled in a class
- 10+ sessions with attendance marked

**Ideal:**
- Multiple teachers with different classes
- 20+ students across multiple classes
- 30+ days of attendance history
- Mix of PRESENT/ABSENT/LATE records
- Some students with perfect attendance
- Some students with poor attendance

---

## 🎯 Acceptance Testing

Before marking Module 6 complete, verify:

**Functional:**
- [ ] All form inputs work
- [ ] Date picker functional
- [ ] Reports generate correctly
- [ ] Downloads work
- [ ] Filters apply correctly
- [ ] Sorting works
- [ ] Search filters results

**Security:**
- [ ] Students can't access other students' data
- [ ] Teachers can't access other teachers' classes
- [ ] Backend validates permissions
- [ ] No unauthorized access via URL manipulation

**Performance:**
- [ ] Page loads in < 2 seconds
- [ ] Report generation in < 5 seconds
- [ ] Large reports (100+ records) handle well
- [ ] No browser freezing

**Usability:**
- [ ] Instructions clear
- [ ] Error messages helpful
- [ ] Success feedback immediate
- [ ] Navigation intuitive

---

## 🚀 Next Steps After Testing

If all tests pass:
1. Mark Module 6 as **COMPLETE** ✅
2. Document any bugs found (if any)
3. Create GitHub issue for bugs (if needed)
4. Proceed to **Module 7: Notifications**

If tests fail:
1. Document failures in detail
2. Debug and fix issues
3. Re-test
4. Update implementation as needed

---

**Happy Testing! 📊**
