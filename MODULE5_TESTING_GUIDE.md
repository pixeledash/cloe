# Module 5 Analytics Dashboard - Testing Guide

## 🧪 How to Test Module 5

### Prerequisites
- Backend and frontend containers running (`docker-compose up`)
- At least 1 student enrolled in a class
- At least 1 class with attendance records
- User logged in as ADMIN or TEACHER

---

## Test Scenarios

### 1️⃣ Access Analytics Dashboard

**Steps:**
1. Log in to the application
2. On the main dashboard, click **"Analytics Dashboard"** card
3. Should navigate to `/analytics`

**Expected Results:**
- ✅ Analytics Dashboard page loads
- ✅ Two main cards visible: "Student Analytics" and "Class Analytics"
- ✅ Student dropdown populates with students
- ✅ Class dropdown populates with classes
- ✅ Info cards display features
- ✅ "Back to Dashboard" button visible

---

### 2️⃣ Test Student Analytics

**Steps:**
1. On Analytics Dashboard, select a student from dropdown
2. Click "View Analytics" button
3. Should navigate to `/analytics/student/{studentId}`

**Expected Results:**
- ✅ Student name and ID displayed in header
- ✅ Risk badge shows (Low/Medium/High) with correct color
- ✅ 4 overview stat cards display:
  - Total Sessions
  - Attendance Rate (with colored gauge)
  - Punctuality Rate
  - Absences & Late
- ✅ Detailed Metrics section shows:
  - Present count (green)
  - Absent count (red)
  - Late count (yellow)
- ✅ Trend indicator shows (Improving/Declining/Stable)
- ✅ Consecutive absences tracked
- ✅ Risk Assessment panel appears if medium/high risk
  - Shows contributing factors
  - Shows intervention recommendations
- ✅ OR Celebration card appears if excellent attendance
- ✅ Class Breakdown table lists all classes
  - Shows per-class attendance rates
  - Color-coded rates
- ✅ "Export CSV" button works (downloads file)
- ✅ "← Back" button returns to Analytics Dashboard

**Edge Cases to Test:**
- Student with no attendance records (should show 0% and appropriate messages)
- Student with perfect attendance (should show celebration card)
- Student with high risk (should show red badge and recommendations)

---

### 3️⃣ Test Class Analytics

**Steps:**
1. On Analytics Dashboard, select a class from dropdown
2. Click "View Analytics" button
3. Should navigate to `/analytics/class/{classId}`

**Expected Results:**
- ✅ Class name and subject displayed in header
- ✅ Overall attendance rate gauge shows with correct color
- ✅ 3 overview stat cards display:
  - Total Sessions
  - Average Attendance
  - Total Students
- ✅ Trends section shows:
  - Recent 10 sessions average
  - Previous 10 sessions average
  - Percentage change with arrow
  - Trend indicator (improving/declining/stable)
- ✅ Student Performance table displays all students
  - Columns: Student, Sessions, Present, Absent, Late, Attendance Rate
  - Click column headers to sort (try all columns)
  - Attendance rate color-coded (green/yellow/red)
  - Chronic absentees have red row background
- ✅ Search box filters students by name
- ✅ Patterns panel has 3 tabs:
  - **Chronic Absentees** tab (students < 70%)
  - **At-Risk Students** tab (students 70-85%)
  - **Perfect Attendance** tab (students 100%)
- ✅ Each tab shows correct count in badge
- ✅ Clicking tabs switches content
- ✅ "Export CSV" button works (downloads file)
- ✅ "← Back" button returns to Analytics Dashboard

**Edge Cases to Test:**
- Class with no sessions (should show "No attendance data")
- Class with < 10 sessions (should show "Insufficient data" for trends)
- Class with all students at 100% (Perfect Attendance tab populated)
- Search for non-existent student name (should show no results)
- Sort by different columns (verify order changes)

---

### 4️⃣ Test Permissions

**ADMIN User:**
- Should see all students and all classes in dropdowns
- Should access any student/class analytics

**TEACHER User:**
- Should only see own classes in dropdown
- Should only see students enrolled in own classes
- Should NOT see other teachers' classes/students

**STUDENT User:**
- Should only be able to access own analytics
- Should navigate directly to `/analytics/student/{their-id}`
- Should NOT see class analytics or other students

---

### 5️⃣ Test CSV Export

**Steps:**
1. On Student Analytics page, click "Export CSV"
2. Check downloaded file

**Expected CSV Content (Student):**
```csv
Metric,Value
Full Name,John Doe
Student ID,STU001
Total Sessions,20
Present,18
Absent,2
Late,0
Attendance Rate,90.00%
Punctuality Rate,100.00%
Risk Level,Low
Trend,Improving
```

**Steps:**
1. On Class Analytics page, click "Export CSV"
2. Check downloaded file

**Expected CSV Content (Class):**
```csv
Student Name,Student ID,Sessions,Present,Absent,Late,Attendance Rate
John Doe,STU001,20,18,2,0,90.00%
Jane Smith,STU002,20,20,0,0,100.00%
...
```

---

### 6️⃣ Test Responsive Design

**Steps:**
1. Open browser DevTools
2. Toggle device toolbar (responsive mode)
3. Test on different screen sizes:
   - Mobile (320px, 375px, 425px)
   - Tablet (768px, 1024px)
   - Desktop (1440px, 1920px)

**Expected Results:**
- ✅ Cards stack vertically on mobile
- ✅ Tables scroll horizontally on mobile
- ✅ Buttons and text remain readable
- ✅ Gauges resize appropriately
- ✅ Navigation works on all sizes

---

### 7️⃣ Test Error Handling

**Simulate Errors:**

**Backend Down:**
1. Stop backend container: `docker-compose stop backend`
2. Try accessing analytics
3. Expected: Error message "Failed to fetch analytics data"
4. Restart: `docker-compose start backend`

**Invalid Student ID:**
1. Navigate to `/analytics/student/99999`
2. Expected: Error message or 404

**Invalid Class ID:**
1. Navigate to `/analytics/class/99999`
2. Expected: Error message or 404

**Network Timeout:**
1. Throttle network in DevTools (Slow 3G)
2. Access analytics
3. Expected: Loading state shows, then data loads

---

### 8️⃣ Test Loading States

**Steps:**
1. Open browser DevTools → Network tab
2. Throttle to "Slow 3G"
3. Navigate to Student Analytics
4. Observe loading behavior

**Expected Results:**
- ✅ Loading spinner or skeleton shows
- ✅ "Loading..." text appears
- ✅ UI doesn't break during load
- ✅ Data populates after load completes

---

### 9️⃣ Visual Regression Testing

**Check Visual Elements:**

**Colors:**
- Green badges/text for ≥85% attendance ✅
- Yellow badges/text for 70-85% attendance ✅
- Red badges/text for <70% attendance ✅
- Gray for no data ✅

**Icons:**
- Risk badges have correct icons (✓/⚠/⚠️) ✅
- Trend arrows correct (↗/↘/→) ✅
- Card icons display properly ✅

**Layout:**
- Cards aligned in grid ✅
- Tables formatted correctly ✅
- Buttons positioned properly ✅
- Spacing consistent ✅

---

### 🔟 Integration Testing

**Full Workflow:**

1. **Admin creates student and enrolls in class** ✅
2. **Teacher starts session for class** ✅
3. **Teacher marks attendance (present/absent/late)** ✅
4. **Navigate to Analytics Dashboard** ✅
5. **View Student Analytics**
   - Verify attendance rate matches marked attendance ✅
   - Verify risk level is correct ✅
   - Verify trend calculates properly ✅
6. **View Class Analytics**
   - Verify student appears in table ✅
   - Verify attendance rate matches ✅
   - Verify patterns tab categorizes correctly ✅
7. **Export both CSVs and verify data** ✅

---

## 🐛 Known Issues / Limitations

### Current Limitations:
- No date range filtering (shows all-time data)
- No visual charts/graphs (only tables and gauges)
- Trend requires ≥10 sessions (shows "Insufficient Data" otherwise)
- CSV export is basic (no advanced formatting)

### Not Bugs:
- "Insufficient Data" for trends with <10 sessions → **Expected behavior**
- "No Data Available" for new students → **Expected behavior**
- Patterns tabs may be empty → **Expected if no students in that category**

---

## ✅ Testing Checklist

### Functional Tests
- [ ] Analytics Dashboard loads
- [ ] Student dropdown populates
- [ ] Class dropdown populates
- [ ] Student Analytics page displays correctly
- [ ] Class Analytics page displays correctly
- [ ] Risk badges show correct colors
- [ ] Trend indicators accurate
- [ ] Gauges display percentages
- [ ] Tables sortable
- [ ] Search filters work
- [ ] Tabs switch correctly
- [ ] CSV exports download
- [ ] Back navigation works

### Permission Tests
- [ ] ADMIN sees all data
- [ ] TEACHER sees only own classes
- [ ] STUDENT sees only own data

### Edge Case Tests
- [ ] No attendance records
- [ ] Perfect attendance (100%)
- [ ] High risk students (<70%)
- [ ] Insufficient sessions (<10)
- [ ] Empty search results
- [ ] Invalid IDs (404)

### Performance Tests
- [ ] Loads in <2 seconds
- [ ] Handles 100+ students
- [ ] Handles 50+ classes
- [ ] CSV exports large datasets

### UI/UX Tests
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] Colors accessible (contrast)
- [ ] Loading states work
- [ ] Error messages clear

---

## 📊 Sample Test Data

### Create Test Students:
```bash
# High Risk Student (50% attendance)
- Sessions: 10
- Present: 5
- Absent: 5
- Expected: Red badge, "High" risk

# At-Risk Student (75% attendance)
- Sessions: 20
- Present: 15
- Absent: 5
- Expected: Yellow badge, "Medium" risk

# Excellent Student (95% attendance)
- Sessions: 20
- Present: 19
- Absent: 1
- Expected: Green badge, "Low" risk, celebration card

# Perfect Student (100% attendance)
- Sessions: 20
- Present: 20
- Absent: 0
- Expected: Green badge, "Low" risk, perfect attendance tab
```

---

## 🎯 Success Criteria

Module 5 is considered **fully functional** if:

✅ All pages load without errors  
✅ Data displays correctly for students and classes  
✅ Risk assessment calculates accurately  
✅ Trends show correct direction  
✅ Patterns categorize students properly  
✅ Tables sort and filter correctly  
✅ CSV export works  
✅ Permissions enforce correctly  
✅ Responsive design works on all devices  
✅ Error handling graceful  
✅ Loading states smooth  

---

## 🚀 Next Steps After Testing

If all tests pass:
1. Mark Module 5 as **COMPLETE** ✅
2. Document any bugs found
3. Fix critical bugs
4. Proceed to **Module 6: Reports**

If tests fail:
1. Document failures
2. Debug and fix issues
3. Re-test
4. Update implementation as needed

---

**Happy Testing! 🎉**
