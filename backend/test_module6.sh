#!/bin/bash

# Module 6: Report Generation Testing Script
# Tests report generation and download functionality

BASE_URL="http://localhost:8000"
CONTENT_TYPE="Content-Type: application/json"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

echo "========================================="
echo "Module 6: Report Generation Testing"
echo "========================================="
echo ""

# Test 1: Teacher Login
echo "Test 1: Teacher Authentication"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login/" \
    -H "$CONTENT_TYPE" \
    -d '{
        "email": "analytics.teacher@test.com",
        "password": "test123"
    }')

TEACHER_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TEACHER_TOKEN" ]; then
    print_result 0 "Teacher login successful"
    TEACHER_AUTH="Authorization: Bearer $TEACHER_TOKEN"
else
    print_result 1 "Teacher login failed"
    echo "Response: $LOGIN_RESPONSE"
fi

# Test 2: Student Login
echo ""
echo "Test 2: Student Authentication"
STUDENT_LOGIN=$(curl -s -X POST "$BASE_URL/api/users/login/" \
    -H "$CONTENT_TYPE" \
    -d '{
        "email": "excellent.student@test.com",
        "password": "test123"
    }')

STUDENT_TOKEN=$(echo $STUDENT_LOGIN | grep -o '"access":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$STUDENT_TOKEN" ]; then
    print_result 0 "Student login successful"
    STUDENT_AUTH="Authorization: Bearer $STUDENT_TOKEN"
else
    print_result 1 "Student login failed"
fi

# Known test data IDs from Module 5
CLASS_ID="57750121-e747-4ce9-af61-4fef11292ed8"
STUDENT_ID="bda18228-20cd-4896-a036-d3ddeadec511"

# Test 3: Generate Student Report (Teacher)
echo ""
echo "Test 3: Generate Student Report (Teacher)"
STUDENT_REPORT=$(curl -s -X POST "$BASE_URL/api/reports/generate/" \
    -H "$TEACHER_AUTH" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"report_type\": \"student\",
        \"student_id\": \"$STUDENT_ID\",
        \"start_date\": \"2026-01-01\",
        \"end_date\": \"2026-01-31\",
        \"format\": \"csv\"
    }")

STUDENT_REPORT_ID=$(echo $STUDENT_REPORT | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$STUDENT_REPORT_ID" ] && echo $STUDENT_REPORT | grep -q "COMPLETED"; then
    print_result 0 "Student report generated successfully"
    echo "   → Report ID: $STUDENT_REPORT_ID"
else
    print_result 1 "Failed to generate student report"
    echo "Response: $STUDENT_REPORT"
fi

# Test 4: Generate Class Report (Teacher)
echo ""
echo "Test 4: Generate Class Report (Teacher)"
CLASS_REPORT=$(curl -s -X POST "$BASE_URL/api/reports/generate/" \
    -H "$TEACHER_AUTH" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"report_type\": \"class\",
        \"class_id\": \"$CLASS_ID\",
        \"start_date\": \"2026-01-01\",
        \"end_date\": \"2026-01-31\",
        \"format\": \"csv\"
    }")

CLASS_REPORT_ID=$(echo $CLASS_REPORT | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$CLASS_REPORT_ID" ] && echo $CLASS_REPORT | grep -q "COMPLETED"; then
    print_result 0 "Class report generated successfully"
    echo "   → Report ID: $CLASS_REPORT_ID"
    
    # Extract file size if available
    FILE_SIZE=$(echo $CLASS_REPORT | grep -o '"file_size":[0-9]*' | cut -d':' -f2)
    if [ ! -z "$FILE_SIZE" ]; then
        echo "   → File Size: $FILE_SIZE bytes"
    fi
else
    print_result 1 "Failed to generate class report"
    echo "Response: $CLASS_REPORT"
fi

# Test 5: Download Student Report
echo ""
echo "Test 5: Download Student Report"
if [ ! -z "$STUDENT_REPORT_ID" ]; then
    DOWNLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reports/$STUDENT_REPORT_ID/download/" \
        -H "$TEACHER_AUTH")
    
    HTTP_CODE=$(echo "$DOWNLOAD_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_result 0 "Student report downloaded successfully"
        
        # Check if CSV content is valid
        if echo "$DOWNLOAD_RESPONSE" | head -n 5 | grep -q "Student Name"; then
            echo "   → CSV header found"
        fi
    else
        print_result 1 "Failed to download student report (HTTP $HTTP_CODE)"
    fi
else
    print_result 1 "Cannot download - no student report ID"
fi

# Test 6: Download Class Report
echo ""
echo "Test 6: Download Class Report"
if [ ! -z "$CLASS_REPORT_ID" ]; then
    CLASS_DOWNLOAD=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/reports/$CLASS_REPORT_ID/download/" \
        -H "$TEACHER_AUTH")
    
    HTTP_CODE=$(echo "$CLASS_DOWNLOAD" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_result 0 "Class report downloaded successfully"
        
        # Check if CSV content is valid
        if echo "$CLASS_DOWNLOAD" | head -n 5 | grep -q "Class Attendance Report"; then
            echo "   → CSV header found"
        fi
    else
        print_result 1 "Failed to download class report (HTTP $HTTP_CODE)"
    fi
else
    print_result 1 "Cannot download - no class report ID"
fi

# Test 7: List Reports
echo ""
echo "Test 7: List Generated Reports"
LIST_REPORTS=$(curl -s -X GET "$BASE_URL/api/reports/" \
    -H "$TEACHER_AUTH")

if echo $LIST_REPORTS | grep -q "\"id\":"; then
    print_result 0 "Reports list retrieved"
    
    # Count reports
    REPORT_COUNT=$(echo $LIST_REPORTS | grep -o '"id":"[^"]*' | wc -l)
    echo "   → Total Reports: $REPORT_COUNT"
else
    print_result 1 "Failed to list reports"
fi

# Test 8: Student Generate Own Report
echo ""
echo "Test 8: Student Generate Own Report"
STUDENT_OWN_REPORT=$(curl -s -X POST "$BASE_URL/api/reports/generate/" \
    -H "$STUDENT_AUTH" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"report_type\": \"student\",
        \"student_id\": \"$STUDENT_ID\",
        \"start_date\": \"2026-01-01\",
        \"end_date\": \"2026-01-31\",
        \"format\": \"csv\"
    }")

if echo $STUDENT_OWN_REPORT | grep -q "COMPLETED"; then
    print_result 0 "Student can generate own report"
else
    print_result 1 "Student cannot generate own report"
    echo "Response: $STUDENT_OWN_REPORT"
fi

# Test 9: Student Cannot Generate Class Report
echo ""
echo "Test 9: Student Permission Validation (Class Report)"
STUDENT_CLASS_REPORT=$(curl -s -X POST "$BASE_URL/api/reports/generate/" \
    -H "$STUDENT_AUTH" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"report_type\": \"class\",
        \"class_id\": \"$CLASS_ID\",
        \"start_date\": \"2026-01-01\",
        \"end_date\": \"2026-01-31\",
        \"format\": \"csv\"
    }")

if echo $STUDENT_CLASS_REPORT | grep -q "cannot generate class reports\|do not have permission"; then
    print_result 0 "Student correctly blocked from class reports"
else
    print_result 1 "Student permission validation failed"
    echo "Response: $STUDENT_CLASS_REPORT"
fi

# Test 10: Invalid Date Range
echo ""
echo "Test 10: Date Range Validation"
INVALID_DATES=$(curl -s -X POST "$BASE_URL/api/reports/generate/" \
    -H "$TEACHER_AUTH" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"report_type\": \"student\",
        \"student_id\": \"$STUDENT_ID\",
        \"start_date\": \"2026-01-31\",
        \"end_date\": \"2026-01-01\",
        \"format\": \"csv\"
    }")

if echo $INVALID_DATES | grep -q "End date must be after\|start date"; then
    print_result 0 "Date range validation working"
else
    print_result 1 "Date range validation failed"
    echo "Response: $INVALID_DATES"
fi

# Test 11: Missing Required Fields
echo ""
echo "Test 11: Required Field Validation"
MISSING_FIELDS=$(curl -s -X POST "$BASE_URL/api/reports/generate/" \
    -H "$TEACHER_AUTH" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"report_type\": \"student\",
        \"start_date\": \"2026-01-01\",
        \"end_date\": \"2026-01-31\"
    }")

if echo $MISSING_FIELDS | grep -q "student_id\|required"; then
    print_result 0 "Required field validation working"
else
    print_result 1 "Required field validation failed"
    echo "Response: $MISSING_FIELDS"
fi

# Test 12: PDF Format Rejection (not yet implemented)
echo ""
echo "Test 12: PDF Format Validation"
PDF_REQUEST=$(curl -s -X POST "$BASE_URL/api/reports/generate/" \
    -H "$TEACHER_AUTH" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"report_type\": \"student\",
        \"student_id\": \"$STUDENT_ID\",
        \"start_date\": \"2026-01-01\",
        \"end_date\": \"2026-01-31\",
        \"format\": \"pdf\"
    }")

if echo $PDF_REQUEST | grep -q "not yet supported\|PDF"; then
    print_result 0 "PDF format correctly rejected"
else
    print_result 1 "PDF format validation failed"
    echo "Response: $PDF_REQUEST"
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "Pass Rate: 100%"
else
    echo -e "${YELLOW}Some tests failed${NC}"
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Pass Rate: ${PASS_RATE}%"
fi
echo "========================================="
