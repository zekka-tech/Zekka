#!/bin/bash

# Team 3 API Endpoints Test Script
# Tests Project Management and Conversation System

BASE_URL="http://localhost:3000"
API_V1="$BASE_URL/api/v1"
TIMESTAMP=$(date +%s%N)

echo "🧪 Team 3 API Endpoints Test"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoints
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5

  echo -e "${BLUE}Testing:${NC} $description"
  echo "  $method $endpoint"

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "$data" \
      "$BASE_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -eq "$expected_status" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
    ((PASSED++))
    echo "$body" | jq . 2>/dev/null || echo "  Response: $body"
  else
    echo -e "  ${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
    ((FAILED++))
    echo "  Response: $body"
  fi

  echo ""
  echo "$body"
}

# 1. Register a test user
echo -e "\n${BLUE}=== Step 1: User Registration ===${NC}\n"

REGISTER_DATA="{
  \"email\": \"test-team3-$TIMESTAMP@example.com\",
  \"password\": \"TestPassword123!@#\",
  \"name\": \"Test User Team 3\"
}"

register_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA" \
  "$BASE_URL/api/auth/register")

echo "Registration Response:"
echo "$register_response" | jq . 2>/dev/null || echo "$register_response"

USER_ID=$(echo "$register_response" | jq -r '.userId // .data.id // .user.id' 2>/dev/null)
USER_EMAIL=$(echo "$register_response" | jq -r '.email // .data.email // .user.email' 2>/dev/null)

if [ "$USER_ID" != "null" ] && [ ! -z "$USER_ID" ]; then
  echo -e "${GREEN}✓ User registered: $USER_ID${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗ Registration failed${NC}"
  ((FAILED++))
  echo "Debug: USER_ID=$USER_ID, USER_EMAIL=$USER_EMAIL"
fi

echo ""

# 2. Login
echo -e "\n${BLUE}=== Step 2: User Login ===${NC}\n"

LOGIN_DATA="{
  \"email\": \"test-team3-$TIMESTAMP@example.com\",
  \"password\": \"TestPassword123!@#\"
}"

login_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA" \
  "$BASE_URL/api/auth/login")

echo "Login Response:"
echo "$login_response" | jq . 2>/dev/null || echo "$login_response"

AUTH_TOKEN=$(echo "$login_response" | jq -r '.token // .data.token // .accessToken // .jwt' 2>/dev/null)

if [ "$AUTH_TOKEN" != "null" ] && [ ! -z "$AUTH_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful, token acquired${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗ Login failed${NC}"
  ((FAILED++))
  echo "Debug: Response was: $login_response"
fi

echo ""

# 3. Create a project
echo -e "\n${BLUE}=== Step 3: Create Project ===${NC}\n"

PROJECT_DATA="{
  \"name\": \"Test Project $TIMESTAMP\",
  \"description\": \"Test project for Team 3 API validation\",
  \"settings\": {
    \"visibility\": \"private\",
    \"maxMembers\": 10
  }
}"

create_project_response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$PROJECT_DATA" \
  "$API_V1/projects")

http_code=$(echo "$create_project_response" | tail -n 1)
project_body=$(echo "$create_project_response" | sed '$d')

echo "Create Project Response (HTTP $http_code):"
echo "$project_body" | jq . 2>/dev/null || echo "$project_body"

PROJECT_ID=$(echo "$project_body" | jq -r '.data.id' 2>/dev/null)

if [ "$http_code" -eq 201 ] && [ "$PROJECT_ID" != "null" ] && [ ! -z "$PROJECT_ID" ]; then
  echo -e "${GREEN}✓ Project created: $PROJECT_ID${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗ Project creation failed${NC}"
  ((FAILED++))
fi

echo ""

# 4. List projects
echo -e "\n${BLUE}=== Step 4: List Projects ===${NC}\n"

list_projects_response=$(curl -s -w "\n%{http_code}" -X GET \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_V1/projects")

http_code=$(echo "$list_projects_response" | tail -n 1)
projects_body=$(echo "$list_projects_response" | sed '$d')

echo "List Projects Response (HTTP $http_code):"
echo "$projects_body" | jq . 2>/dev/null | head -30

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✓ Projects listed successfully${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗ List projects failed${NC}"
  ((FAILED++))
fi

echo ""

# 5. Get project details
if [ ! -z "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
  echo -e "\n${BLUE}=== Step 5: Get Project Details ===${NC}\n"

  get_project_response=$(curl -s -w "\n%{http_code}" -X GET \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$API_V1/projects/$PROJECT_ID")

  http_code=$(echo "$get_project_response" | tail -n 1)
  project_detail=$(echo "$get_project_response" | sed '$d')

  echo "Get Project Response (HTTP $http_code):"
  echo "$project_detail" | jq . 2>/dev/null || echo "$project_detail"

  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Project details retrieved${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ Get project failed${NC}"
    ((FAILED++))
  fi

  echo ""

  # 6. Create a conversation
  echo -e "\n${BLUE}=== Step 6: Create Conversation ===${NC}\n"

  CONVERSATION_DATA="{
    \"title\": \"Test Conversation $TIMESTAMP\",
    \"projectId\": \"$PROJECT_ID\",
    \"metadata\": {
      \"topic\": \"API Testing\"
    }
  }"

  create_conversation_response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$CONVERSATION_DATA" \
    "$API_V1/conversations")

  http_code=$(echo "$create_conversation_response" | tail -n 1)
  conversation_body=$(echo "$create_conversation_response" | sed '$d')

  echo "Create Conversation Response (HTTP $http_code):"
  echo "$conversation_body" | jq . 2>/dev/null || echo "$conversation_body"

  CONVERSATION_ID=$(echo "$conversation_body" | jq -r '.data.id' 2>/dev/null)

  if [ "$http_code" -eq 201 ] && [ "$CONVERSATION_ID" != "null" ] && [ ! -z "$CONVERSATION_ID" ]; then
    echo -e "${GREEN}✓ Conversation created: $CONVERSATION_ID${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ Conversation creation failed${NC}"
    ((FAILED++))
  fi

  echo ""

  # 7. Send a message
  if [ ! -z "$CONVERSATION_ID" ] && [ "$CONVERSATION_ID" != "null" ]; then
    echo -e "\n${BLUE}=== Step 7: Send Message ===${NC}\n"

    MESSAGE_DATA="{
      \"content\": \"Hello from Team 3 API test! $TIMESTAMP\",
      \"role\": \"user\",
      \"metadata\": {
        \"source\": \"api_test\"
      }
    }"

    send_message_response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "$MESSAGE_DATA" \
      "$API_V1/conversations/$CONVERSATION_ID/messages")

    http_code=$(echo "$send_message_response" | tail -n 1)
    message_body=$(echo "$send_message_response" | sed '$d')

    echo "Send Message Response (HTTP $http_code):"
    echo "$message_body" | jq . 2>/dev/null || echo "$message_body"

    if [ "$http_code" -eq 201 ]; then
      echo -e "${GREEN}✓ Message sent successfully${NC}"
      ((PASSED++))
    else
      echo -e "${RED}✗ Send message failed${NC}"
      ((FAILED++))
    fi

    echo ""

    # 8. Get messages
    echo -e "\n${BLUE}=== Step 8: Get Messages ===${NC}\n"

    get_messages_response=$(curl -s -w "\n%{http_code}" -X GET \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$API_V1/conversations/$CONVERSATION_ID/messages?limit=10&offset=0")

    http_code=$(echo "$get_messages_response" | tail -n 1)
    messages_body=$(echo "$get_messages_response" | sed '$d')

    echo "Get Messages Response (HTTP $http_code):"
    echo "$messages_body" | jq . 2>/dev/null | head -40

    if [ "$http_code" -eq 200 ]; then
      echo -e "${GREEN}✓ Messages retrieved successfully${NC}"
      ((PASSED++))
    else
      echo -e "${RED}✗ Get messages failed${NC}"
      ((FAILED++))
    fi
  fi
fi

# Print summary
echo ""
echo "=================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
