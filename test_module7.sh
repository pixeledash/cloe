#!/bin/bash

# Module 7 - Email Notifications Testing Script
# This script tests the email notification system with Celery + Redis

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:8000/api"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=10

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "========================================"
echo "MODULE 7: EMAIL NOTIFICATIONS"
echo "Testing Email System with Celery + Redis"
echo "========================================"
echo ""

# Test account tokens
ADMIN_TOKEN=""
TEACHER_TOKEN=""
STUDENT_TOKEN=""

echo "========================================" 
echo "STEP 1: Authentication"
echo "========================================"

# Test 1: Admin login
echo -n "Test 1: Admin authentication... "
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login/" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@test.com",
        "password": "test123"
    }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    print_result 0 "Admin authenticated"
else
    print_result 1 "Admin authentication failed"
    echo "Response: $ADMIN_RESPONSE"
fi

# Test 2: Teacher login
echo -n "Test 2: Teacher authentication... "
TEACHER_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login/" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "analytics.teacher@test.com",
        "password": "test123"
    }')

TEACHER_TOKEN=$(echo $TEACHER_RESPONSE | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TEACHER_TOKEN" ]; then
    print_result 0 "Teacher authenticated"
else
    print_result 1 "Teacher authentication failed"
    echo "Response: $TEACHER_RESPONSE"
fi

# Test 3: Student login
echo -n "Test 3: Student authentication... "
STUDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/users/login/" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "excellent.student@test.com",
        "password": "test123"
    }')

STUDENT_TOKEN=$(echo $STUDENT_RESPONSE | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

if [ -n "$STUDENT_TOKEN" ]; then
    print_result 0 "Student authenticated"
else
    print_result 1 "Student authentication failed"
    echo "Response: $STUDENT_RESPONSE"
fi

echo ""
echo "========================================"
echo "STEP 2: Trigger Weekly Reports"
echo "========================================"

# Test 4: Trigger weekly reports (specific students)
echo -n "Test 4: Trigger weekly reports for specific students... "
WEEKLY_RESPONSE=$(curl -s -X POST "$BASE_URL/notifications/trigger-weekly-report/" \
    -H "Authorization: Bearer $TEACHER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "send_to_all": false,
        "student_emails": ["excellent.student@test.com"]
    }')

if echo "$WEEKLY_RESPONSE" | grep -q '"status":"queued"'; then
    print_result 0 "Weekly report queued successfully"
    echo "Response: $WEEKLY_RESPONSE"
else
    print_result 1 "Failed to queue weekly report"
    echo "Response: $WEEKLY_RESPONSE"
fi

# Test 5: Trigger weekly reports for all students (Admin only)
echo -n "Test 5: Trigger weekly reports for all students (Admin)... "
WEEKLY_ALL_RESPONSE=$(curl -s -X POST "$BASE_URL/notifications/trigger-weekly-report/" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "send_to_all": true
    }')

if echo "$WEEKLY_ALL_RESPONSE" | grep -q '"status":"queued"'; then
    print_result 0 "Weekly reports queued for all students"
    echo "Response: $WEEKLY_ALL_RESPONSE"
else
    print_result 1 "Failed to queue weekly reports for all"
    echo "Response: $WEEKLY_ALL_RESPONSE"
fi

echo ""
echo "========================================"
echo "STEP 3: Trigger Low Attendance Alerts"
echo "========================================"

# Test 6: Trigger low attendance alerts
echo -n "Test 6: Trigger low attendance alerts... "
ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/notifications/trigger-low-attendance-alert/" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "threshold": 75.0
    }')

if echo "$ALERT_RESPONSE" | grep -q '"status":"queued"'; then
    print_result 0 "Low attendance alerts queued"
    echo "Response: $ALERT_RESPONSE"
else
    print_result 1 "Failed to queue low attendance alerts"
    echo "Response: $ALERT_RESPONSE"
fi

# Wait for Celery to process tasks
echo ""
echo "Waiting 5 seconds for Celery to process tasks..."
sleep 5

echo ""
echo "========================================"
echo "STEP 4: List Notifications"
echo "========================================"

# Test 7: Admin lists all notifications
echo -n "Test 7: Admin lists all notifications... "
ADMIN_LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/notifications/" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$ADMIN_LIST_RESPONSE" | grep -q '"count"'; then
    NOTIFICATION_COUNT=$(echo "$ADMIN_LIST_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    print_result 0 "Admin can view all notifications (count: $NOTIFICATION_COUNT)"
else
    print_result 1 "Failed to list notifications"
    echo "Response: $ADMIN_LIST_RESPONSE"
fi

# Test 8: Student lists own notifications
echo -n "Test 8: Student lists own notifications... "
STUDENT_LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/notifications/" \
    -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$STUDENT_LIST_RESPONSE" | grep -q '"count"'; then
    STUDENT_NOTIF_COUNT=$(echo "$STUDENT_LIST_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    print_result 0 "Student can view own notifications (count: $STUDENT_NOTIF_COUNT)"
else
    print_result 1 "Failed to list student notifications"
    echo "Response: $STUDENT_LIST_RESPONSE"
fi

echo ""
echo "========================================"
echo "STEP 5: Filter and Query Notifications"
echo "========================================"

# Test 9: Filter by notification type
echo -n "Test 9: Filter notifications by type... "
FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/notifications/?type=WEEKLY_REPORT" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$FILTER_RESPONSE" | grep -q '"count"'; then
    FILTERED_COUNT=$(echo "$FILTER_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    print_result 0 "Filtered by type (count: $FILTERED_COUNT)"
else
    print_result 1 "Failed to filter notifications"
    echo "Response: $FILTER_RESPONSE"
fi

# Test 10: Filter by status
echo -n "Test 10: Filter notifications by status... "
STATUS_FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/notifications/?status=SENT" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$STATUS_FILTER_RESPONSE" | grep -q '"count"'; then
    SENT_COUNT=$(echo "$STATUS_FILTER_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    print_result 0 "Filtered by status (sent: $SENT_COUNT)"
else
    print_result 1 "Failed to filter by status"
    echo "Response: $STATUS_FILTER_RESPONSE"
fi

echo ""
echo "========================================"
echo "ADDITIONAL INFORMATION"
echo "========================================"

# Check Redis connection
echo "Checking Redis connection..."
if docker exec redis_broker redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis is running"
else
    echo -e "${RED}✗${NC} Redis is not responding"
fi

# Check Celery worker
echo "Checking Celery worker..."
if docker logs celery_worker 2>&1 | grep -q "ready"; then
    echo -e "${GREEN}✓${NC} Celery worker is running"
else
    echo -e "${YELLOW}⚠${NC} Celery worker may not be ready (check logs: docker logs celery_worker)"
fi

# Check Celery beat
echo "Checking Celery beat..."
if docker logs celery_beat 2>&1 | grep -q "beat"; then
    echo -e "${GREEN}✓${NC} Celery beat is running"
else
    echo -e "${YELLOW}⚠${NC} Celery beat may not be ready (check logs: docker logs celery_beat)"
fi

echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

PERCENTAGE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
echo "Success Rate: $PERCENTAGE%"

echo ""
echo "========================================"
echo "NOTES"
echo "========================================"
echo "1. Email delivery requires SMTP configuration in .env"
echo "2. Check Celery logs: docker logs celery_worker"
echo "3. Check Celery beat logs: docker logs celery_beat"
echo "4. Check Redis: docker exec redis_broker redis-cli monitor"
echo "5. Scheduled tasks run according to CELERY_BEAT_SCHEDULE in settings.py"
echo "   - Weekly reports: Every Sunday at 8 AM"
echo "   - Low attendance alerts: Every Monday at 9 AM"
echo "   - Cleanup old notifications: Every Monday at 2 AM"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Module 7 is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
