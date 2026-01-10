#!/bin/bash

# Simple test for start session endpoint

# Login and get token
echo "1. Logging in..."
TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"test.teacher@example.com","password":"testpass123"}' | jq -r '.tokens.access')

echo "Token (first 50 chars): ${TOKEN:0:50}..."
echo ""

# Get class ID
echo "2. Getting class ID..."
CLASS_ID=$(curl -s -X GET "http://localhost:8000/api/classes/" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[1].id')

echo "Class ID: $CLASS_ID"
echo ""

# Start session
echo "3. Starting session..."
RESPONSE=$(curl -s -X POST "http://localhost:8000/api/sessions/start/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"class_id\":\"$CLASS_ID\"}")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract session ID
SESSION_ID=$(echo "$RESPONSE" | jq -r '.session.id' 2>/dev/null)
echo "Session ID: $SESSION_ID"
