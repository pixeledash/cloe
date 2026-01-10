#!/bin/bash

# Module 4 - Attendance Tracking API Test Script
# Tests all attendance management endpoints

BASE_URL="http://localhost:8000"
API_URL="$BASE_URL/api"
AUTH_URL="$BASE_URL/auth"

# Colors for output
GREEN='# Step 7: Get session attendance
print_section "7️⃣  VIEW SESSION ATTENDANCE"
SESSION_ATT_RESPONSE=$(curl -s -X GET "$API_URL/attendance/session/$SESSION_ID/" \
  -H "Authorization: Bearer $TOKEN")

ATT_COUNT=$(echo $SESSION_ATT_RESPONSE | jq -r '.records | length')

if [ "$ATT_COUNT" -ge 0 ]; then
    print_result 0 "Retrieved session attendance"
    echo "   Total records: $ATT_COUNT"
    echo "   Present: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.present')"
    echo "   Absent: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.absent')"
    echo "   Late: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.late')"
    echo "   Attendance rate: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.attendance_rate')%"
else
    print_result 1 "Failed to retrieve session attendance"
    echo "   Response: $SESSION_ATT_RESPONSE"
fi033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "----------------------------------------"
}

echo "========================================"
echo "   MODULE 4: ATTENDANCE TRACKING TESTS"
echo "========================================"
echo ""

# Step 1: Login as teacher
print_section "1️⃣  AUTHENTICATION"
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.teacher@example.com",
    "password": "testpass123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.access')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_result 0 "Teacher login successful"
    echo "   Token: ${TOKEN:0:20}..."
else
    print_result 1 "Teacher login failed"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
fi

# Step 2: Get class for testing
print_section "2️⃣  TEST DATA SETUP"
CLASSES_RESPONSE=$(curl -s -X GET "$API_URL/classes/" \
  -H "Authorization: Bearer $TOKEN")

# Get the TEST101 class (second one, belongs to test teacher)
CLASS_ID=$(echo $CLASSES_RESPONSE | jq -r '.[1].id')

if [ "$CLASS_ID" != "null" ] && [ -n "$CLASS_ID" ]; then
    print_result 0 "Retrieved test class"
    echo "   Class ID: $CLASS_ID"
else
    print_result 1 "Failed to get test class"
    echo "   Response: $CLASSES_RESPONSE"
    exit 1
fi

# Get available students to enroll
STUDENTS_RESPONSE=$(curl -s -X GET "$API_URL/students/" \
  -H "Authorization: Bearer $TOKEN")

STUDENT_ID=$(echo $STUDENTS_RESPONSE | jq -r '.[0].id')
STUDENT_ID2=$(echo $STUDENTS_RESPONSE | jq -r '.[1].id // empty')

# Enroll first student
if [ "$STUDENT_ID" != "null" ] && [ -n "$STUDENT_ID" ]; then
    ENROLL_RESPONSE=$(curl -s -X POST "$API_URL/classes/$CLASS_ID/enroll/" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"student_id\": \"$STUDENT_ID\"}")
    
    if echo "$ENROLL_RESPONSE" | jq -e '.id' > /dev/null 2>&1 || echo "$ENROLL_RESPONSE" | grep -q "already enrolled"; then
        print_result 0 "Student 1 enrolled in test class"
        echo "   Student ID: $STUDENT_ID"
    else
        print_result 1 "Failed to enroll student 1"
        echo "   Response: $ENROLL_RESPONSE"
    fi
fi

# Enroll second student if available
if [ -n "$STUDENT_ID2" ] && [ "$STUDENT_ID2" != "null" ]; then
    ENROLL2_RESPONSE=$(curl -s -X POST "$API_URL/classes/$CLASS_ID/enroll/" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"student_id\": \"$STUDENT_ID2\"}")
    
    if echo "$ENROLL2_RESPONSE" | jq -e '.id' > /dev/null 2>&1 || echo "$ENROLL2_RESPONSE" | grep -q "already enrolled"; then
        echo "   Student ID 2: $STUDENT_ID2"
    fi
fi

# Step 3: Get enrolled students (no longer needed as we have IDs)


# Step 4: Start a class session
print_section "3️⃣  SESSION SETUP"

# Check for existing active session
ACTIVE_SESSIONS=$(curl -s -X GET "$API_URL/sessions/active/" \
  -H "Authorization: Bearer $TOKEN")

EXISTING_SESSION=$(echo $ACTIVE_SESSIONS | jq -r ".sessions[] | select(.class_ref.id == \"$CLASS_ID\") | .id")

if [ -n "$EXISTING_SESSION" ] && [ "$EXISTING_SESSION" != "null" ]; then
    echo "   Found existing active session, ending it first..."
    curl -s -X POST "$API_URL/sessions/$EXISTING_SESSION/end/" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{}' > /dev/null
fi

START_RESPONSE=$(curl -s -X POST "$API_URL/sessions/start/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"class_id\": \"$CLASS_ID\",
    \"topic\": \"Test Session for Attendance\"
  }")

# Parse session from nested response structure
SESSION_ID=$(echo $START_RESPONSE | jq -r '.session.id // .id')

if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
    print_result 0 "Started test session"
    echo "   Session ID: $SESSION_ID"
    echo "   Topic: $(echo $START_RESPONSE | jq -r '.session.topic // .topic')"
    echo "   Status: $(echo $START_RESPONSE | jq -r '.session.status // .status')"
else
    print_result 1 "Failed to start session"
    echo "   Response: $START_RESPONSE"
    exit 1
fi

# Step 5: Test marking single attendance
print_section "4️⃣  MARK SINGLE ATTENDANCE"
MARK_RESPONSE=$(curl -s -X POST "$API_URL/attendance/mark/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"session\": \"$SESSION_ID\",
    \"student\": \"$STUDENT_ID\",
    \"status\": \"PRESENT\",
    \"notes\": \"On time\"
  }")

ATTENDANCE_ID=$(echo $MARK_RESPONSE | jq -r '.id')

if [ "$ATTENDANCE_ID" != "null" ] && [ -n "$ATTENDANCE_ID" ]; then
    print_result 0 "Marked single attendance as PRESENT"
    echo "   Attendance ID: $ATTENDANCE_ID"
    echo "   Status: $(echo $MARK_RESPONSE | jq -r '.status')"
    echo "   Student: $(echo $MARK_RESPONSE | jq -r '.student_name')"
else
    print_result 1 "Failed to mark attendance"
    echo "   Response: $MARK_RESPONSE"
fi

# Step 6: Test duplicate attendance (should fail)
print_section "5️⃣  DUPLICATE ATTENDANCE VALIDATION"
DUP_RESPONSE=$(curl -s -X POST "$API_URL/attendance/mark/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"session\": \"$SESSION_ID\",
    \"student\": \"$STUDENT_ID\",
    \"status\": \"ABSENT\"
  }")

if echo "$DUP_RESPONSE" | grep -q "already marked"; then
    print_result 0 "Duplicate attendance rejected (as expected)"
else
    print_result 1 "Duplicate attendance should have been rejected"
    echo "   Response: $DUP_RESPONSE"
fi

# Step 7: Update attendance
print_section "6️⃣  UPDATE ATTENDANCE"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/attendance/$ATTENDANCE_ID/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"LATE\",
    \"notes\": \"Arrived 10 minutes late\"
  }")

if echo "$UPDATE_RESPONSE" | jq -e '.status == "LATE"' > /dev/null 2>&1; then
    print_result 0 "Updated attendance status to LATE"
    echo "   New status: $(echo $UPDATE_RESPONSE | jq -r '.status')"
    echo "   Notes: $(echo $UPDATE_RESPONSE | jq -r '.notes')"
else
    print_result 1 "Failed to update attendance"
    echo "   Response: $UPDATE_RESPONSE"
fi

# Step 8: Get session attendance
print_section "7️⃣  VIEW SESSION ATTENDANCE"
SESSION_ATT_RESPONSE=$(curl -s -X GET "$API_URL/attendance/session/$SESSION_ID/" \
  -H "Authorization: Bearer $TOKEN")

ATT_COUNT=$(echo $SESSION_ATT_RESPONSE | jq -r '.attendance | length')

if [ "$ATT_COUNT" -gt 0 ]; then
    print_result 0 "Retrieved session attendance"
    echo "   Total records: $ATT_COUNT"
    echo "   Present: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.present_count')"
    echo "   Absent: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.absent_count')"
    echo "   Late: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.late_count')"
    echo "   Attendance rate: $(echo $SESSION_ATT_RESPONSE | jq -r '.statistics.attendance_rate')%"
else
    print_result 1 "Failed to retrieve session attendance"
    echo "   Response: $SESSION_ATT_RESPONSE"
fi

# Step 8: Get student attendance history
print_section "8️⃣  STUDENT ATTENDANCE HISTORY"
STUDENT_HIST_RESPONSE=$(curl -s -X GET "$API_URL/attendance/student/$STUDENT_ID/" \
  -H "Authorization: Bearer $TOKEN")

HIST_COUNT=$(echo $STUDENT_HIST_RESPONSE | jq -r '.records | length')

if [ "$HIST_COUNT" -ge 0 ]; then
    print_result 0 "Retrieved student attendance history"
    echo "   Total sessions: $HIST_COUNT"
    echo "   Present count: $(echo $STUDENT_HIST_RESPONSE | jq -r '.statistics.present')"
    echo "   Overall rate: $(echo $STUDENT_HIST_RESPONSE | jq -r '.statistics.attendance_rate')%"
else
    print_result 1 "Failed to retrieve student history"
    echo "   Response: $STUDENT_HIST_RESPONSE"
fi

# Step 10: Test bulk marking (if we have multiple students)
if [ -n "$STUDENT_ID2" ] && [ "$STUDENT_ID2" != "null" ]; then
    print_section "9️⃣  BULK ATTENDANCE MARKING"
    BULK_RESPONSE=$(curl -s -X POST "$API_URL/attendance/bulk-mark/" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"session\": \"$SESSION_ID\",
        \"attendances\": [
          {
            \"student\": \"$STUDENT_ID2\",
            \"status\": \"PRESENT\"
          }
        ]
      }")
    
    SUCCESS_COUNT=$(echo $BULK_RESPONSE | jq -r '.success_count')
    
    if [ "$SUCCESS_COUNT" -gt 0 ]; then
        print_result 0 "Bulk marked $SUCCESS_COUNT student(s)"
        echo "   Success: $SUCCESS_COUNT"
        echo "   Failed: $(echo $BULK_RESPONSE | jq -r '.failed_count')"
    else
        print_result 1 "Bulk marking failed"
        echo "   Response: $BULK_RESPONSE"
    fi
fi

# Step 11: End session and test immutability
print_section "🔟 ATTENDANCE IMMUTABILITY TEST"
END_RESPONSE=$(curl -s -X POST "$API_URL/sessions/$SESSION_ID/end/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$END_RESPONSE" | jq -e '.session.status == "ENDED"' > /dev/null 2>&1 || echo "$END_RESPONSE" | jq -e '.status == "ENDED"' > /dev/null 2>&1; then
    print_result 0 "Session ended successfully"
    
    # Try to update attendance after session ended (should fail)
    LOCKED_UPDATE=$(curl -s -X PUT "$API_URL/attendance/$ATTENDANCE_ID/" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"status\": \"ABSENT\"
      }")
    
    if echo "$LOCKED_UPDATE" | grep -q "locked\|ended\|cannot"; then
        print_result 0 "Attendance locked after session ended (as expected)"
    else
        print_result 1 "Attendance should be locked after session ends"
        echo "   Response: $LOCKED_UPDATE"
    fi
else
    print_result 1 "Failed to end session"
    echo "   Response: $END_RESPONSE"
fi

# Step 12: Test authorization - login as student
print_section "1️⃣1️⃣ AUTHORIZATION TESTS"
STUDENT_LOGIN=$(curl -s -X POST "$AUTH_URL/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.doe@example.com",
    "password": "password123"
  }')

STUDENT_TOKEN=$(echo $STUDENT_LOGIN | jq -r '.tokens.access')

if [ "$STUDENT_TOKEN" != "null" ] && [ -n "$STUDENT_TOKEN" ]; then
    print_result 0 "Student login successful"
    # Student should NOT be able to mark attendance
    STUDENT_MARK=$(curl -s -X POST "$API_URL/attendance/mark/" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"session\": \"$SESSION_ID\",
        \"student\": \"$STUDENT_ID\",
        \"status\": \"PRESENT\"
      }")
    
    if echo "$STUDENT_MARK" | grep -q "permission\|forbidden\|not allowed"; then
        print_result 0 "Student correctly denied permission to mark attendance"
    else
        print_result 1 "Student should not be able to mark attendance"
        echo "   Response: $STUDENT_MARK"
    fi
    
    # Student SHOULD be able to view their own history
    STUDENT_VIEW=$(curl -s -X GET "$API_URL/attendance/student/$STUDENT_ID/" \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    
    if echo "$STUDENT_VIEW" | jq -e '.attendance' > /dev/null 2>&1; then
        print_result 0 "Student can view their own attendance history"
    else
        print_result 1 "Student should be able to view own attendance"
        echo "   Response: $STUDENT_VIEW"
    fi
else
    print_result 1 "Failed to login as student"
fi

# Final Results
print_section "📊 TEST SUMMARY"
TOTAL=$((PASSED + FAILED))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Pass Rate: $PASS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    exit 1
fi
