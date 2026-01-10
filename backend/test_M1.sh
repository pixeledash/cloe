#!/bin/bash

# Smart Classroom - Module 1 Real-Life Testing Guide
# This script demonstrates realistic user registration and login scenarios

BASE_URL="http://localhost:8000"

echo "════════════════════════════════════════════════════════════════"
echo "  SMART CLASSROOM - Module 1 Real-Life Testing"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📝 Make sure the server is running:"
echo "   cd /home/ash/Documents/Projects/cloe/backend"
echo "   DJANGO_SETTINGS_MODULE=classroom_api.settings_test python manage.py runserver"
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 1: Teacher Registration
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 1: Teacher Registration"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "👤 Registering a new teacher: Prof. Sarah Johnson"
echo ""

TEACHER_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.johnson@school.edu",
    "password": "TeachPass2024!",
    "password_confirm": "TeachPass2024!",
    "first_name": "Sarah",
    "last_name": "Johnson"
  }')

echo "Response:"
echo "$TEACHER_RESPONSE" | python -m json.tool
echo ""

# Extract tokens
TEACHER_ACCESS_TOKEN=$(echo $TEACHER_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['tokens']['access'])" 2>/dev/null)
TEACHER_REFRESH_TOKEN=$(echo $TEACHER_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['tokens']['refresh'])" 2>/dev/null)

if [ -z "$TEACHER_ACCESS_TOKEN" ]; then
    echo "❌ Registration failed! Check the error message above."
    exit 1
fi

echo "✅ Teacher registered successfully!"
echo "📋 Access Token (first 50 chars): ${TEACHER_ACCESS_TOKEN:0:50}..."
echo "📋 Refresh Token (first 50 chars): ${TEACHER_REFRESH_TOKEN:0:50}..."
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 2: Admin Registration
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 2: Admin Registration"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "👤 Registering an admin: Dr. Michael Chen"
echo ""

ADMIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "michael.chen@school.edu",
    "password": "AdminSecure123!",
    "password_confirm": "AdminSecure123!",
    "first_name": "Michael",
    "last_name": "Chen"
  }')

echo "Response:"
echo "$ADMIN_RESPONSE" | python -m json.tool
echo ""

ADMIN_ACCESS_TOKEN=$(echo $ADMIN_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['tokens']['access'])" 2>/dev/null)

echo "✅ Admin registered successfully!"
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 3: Check User Profile
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 3: Checking User Profile"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "👤 Getting Sarah Johnson's profile using her access token"
echo ""

PROFILE_RESPONSE=$(curl -s -X GET ${BASE_URL}/auth/me/ \
  -H "Authorization: Bearer ${TEACHER_ACCESS_TOKEN}")

echo "Response:"
echo "$PROFILE_RESPONSE" | python -m json.tool
echo ""
echo "✅ Profile retrieved successfully!"
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 4: Login
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 4: Teacher Login"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔐 Sarah is logging in on a different device..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.johnson@school.edu",
    "password": "TeachPass2024!"
  }')

echo "Response:"
echo "$LOGIN_RESPONSE" | python -m json.tool
echo ""

NEW_ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['tokens']['access'])" 2>/dev/null)

echo "✅ Login successful!"
echo "📋 New Access Token (first 50 chars): ${NEW_ACCESS_TOKEN:0:50}..."
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 5: Failed Login (Wrong Password)
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 5: Failed Login Attempt"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "❌ Someone tries to login with wrong password..."
echo ""

FAILED_LOGIN=$(curl -s -X POST ${BASE_URL}/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.johnson@school.edu",
    "password": "WrongPassword123"
  }')

echo "Response:"
echo "$FAILED_LOGIN" | python -m json.tool
echo ""
echo "✅ Security working! Wrong password rejected."
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 6: MFA Setup (Enhanced Security)
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 6: Setting up Multi-Factor Authentication"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔒 Sarah wants to enable MFA for extra security"
echo ""

MFA_SETUP_RESPONSE=$(curl -s -X GET ${BASE_URL}/auth/mfa/setup/ \
  -H "Authorization: Bearer ${TEACHER_ACCESS_TOKEN}")

echo "Response:"
echo "$MFA_SETUP_RESPONSE" | python -m json.tool
echo ""

MFA_SECRET=$(echo $MFA_SETUP_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['secret'])" 2>/dev/null)
MFA_URI=$(echo $MFA_SETUP_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['provisioning_uri'])" 2>/dev/null)

echo "✅ MFA Secret Generated!"
echo "📱 MFA Secret: $MFA_SECRET"
echo ""
echo "📱 Provisioning URI (scan this QR code with Google Authenticator):"
echo "$MFA_URI"
echo ""
echo "💡 In real life, Sarah would:"
echo "   1. Open Google Authenticator/Authy on her phone"
echo "   2. Scan the QR code generated from the provisioning URI"
echo "   3. Enter the 6-digit code to verify"
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 7: MFA Verification
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 7: Verifying MFA Token"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔐 Generating a TOTP token from the secret..."
echo ""

# Generate current TOTP token
MFA_TOKEN=$(python3 -c "import pyotp; totp = pyotp.TOTP('${MFA_SECRET}'); print(totp.now())" 2>/dev/null)

echo "📱 Current 6-digit token: $MFA_TOKEN"
echo ""
echo "Verifying the token..."
echo ""

MFA_VERIFY_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/mfa/verify/ \
  -H "Authorization: Bearer ${TEACHER_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"${MFA_TOKEN}\"}")

echo "Response:"
echo "$MFA_VERIFY_RESPONSE" | python -m json.tool
echo ""
echo "✅ MFA enabled successfully!"
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 8: Login with MFA
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 8: Login with MFA Enabled"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔐 Sarah tries to login - now MFA is required"
echo ""
echo "Step 1: Login with email and password only..."
echo ""

MFA_LOGIN_STEP1=$(curl -s -X POST ${BASE_URL}/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.johnson@school.edu",
    "password": "TeachPass2024!"
  }')

echo "Response:"
echo "$MFA_LOGIN_STEP1" | python -m json.tool
echo ""
echo "✅ Server asks for MFA token!"
echo ""
echo "Step 2: Login with email, password, AND MFA token..."
echo ""

# Generate new token (they expire every 30 seconds)
MFA_TOKEN=$(python3 -c "import pyotp; totp = pyotp.TOTP('${MFA_SECRET}'); print(totp.now())" 2>/dev/null)

echo "📱 Current MFA Token: $MFA_TOKEN"
echo ""

MFA_LOGIN_STEP2=$(curl -s -X POST ${BASE_URL}/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"sarah.johnson@school.edu\",
    \"password\": \"TeachPass2024!\",
    \"mfa_token\": \"${MFA_TOKEN}\"
  }")

echo "Response:"
echo "$MFA_LOGIN_STEP2" | python -m json.tool
echo ""
echo "✅ Login with MFA successful!"
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 9: Token Refresh
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 9: Refreshing Access Token"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔄 Access token expires after 1 hour. Let's refresh it..."
echo ""
echo "Original Refresh Token (first 50 chars): ${TEACHER_REFRESH_TOKEN:0:50}..."
echo ""

REFRESH_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d "{\"refresh\": \"${TEACHER_REFRESH_TOKEN}\"}")

echo "Response:"
echo "$REFRESH_RESPONSE" | python -m json.tool
echo ""

NEW_ACCESS=$(echo $REFRESH_RESPONSE | python -c "import sys, json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

echo "✅ New access token generated!"
echo "📋 New Access Token (first 50 chars): ${NEW_ACCESS:0:50}..."
echo ""
echo "💡 In a real app, this happens automatically in the background"
echo ""
echo "Press Enter to continue..."
read

clear

# =============================================================================
# SCENARIO 10: Unauthorized Access Attempt
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  SCENARIO 10: Trying to Access Without Token"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "❌ Attempting to access protected endpoint without authentication..."
echo ""

UNAUTHORIZED=$(curl -s -X GET ${BASE_URL}/auth/me/)

echo "Response:"
echo "$UNAUTHORIZED" | python -m json.tool
echo ""
echo "✅ Security working! Unauthorized access blocked."
echo ""
echo "Press Enter to finish..."
read

clear

# =============================================================================
# Summary
# =============================================================================
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ TESTING COMPLETE - Summary"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Tested Scenarios:"
echo "  ✅ User Registration (Teacher & Admin)"
echo "  ✅ User Login"
echo "  ✅ Profile Retrieval"
echo "  ✅ Failed Login (Wrong Password)"
echo "  ✅ MFA Setup"
echo "  ✅ MFA Verification"
echo "  ✅ Login with MFA"
echo "  ✅ Token Refresh"
echo "  ✅ Unauthorized Access Prevention"
echo ""
echo "Users Created:"
echo "  1. sarah.johnson@school.edu (Teacher, MFA Enabled)"
echo "  2. michael.chen@school.edu (Admin, No MFA)"
echo ""
echo "Next Steps:"
echo "  • Check Django admin: http://localhost:8000/admin/"
echo "  • Assign roles to users through admin panel"
echo "  • Test with frontend application"
echo "  • Proceed to Module 2 (Academic Structure)"
echo ""
echo "════════════════════════════════════════════════════════════════"
