#!/bin/bash
# Zekka Framework - Security Testing Suite
# Tests all Phase 1 security implementations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_EMAIL="security-test-$(date +%s)@example.com"
TEST_PASSWORD="SecureTest@P@ssw0rd123"
TEST_NAME="Security Test User"

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Functions
print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
    ((TOTAL++))
}

print_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
    ((TOTAL++))
}

print_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

# Test 1: Health Check
test_health_check() {
    print_header "Test 1: Health Check"
    print_test "GET /health"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -1)
    
    if [ "$STATUS" = "200" ]; then
        print_pass "Health check returned 200"
    else
        print_fail "Health check returned $STATUS"
    fi
}

# Test 2: CSRF Token Retrieval
test_csrf_token() {
    print_header "Test 2: CSRF Token"
    print_test "GET /api/auth/csrf-token"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -c cookies.txt "$BASE_URL/api/auth/csrf-token")
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -1)
    
    if [ "$STATUS" = "200" ]; then
        CSRF_TOKEN=$(echo "$BODY" | jq -r '.csrfToken')
        if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
            print_pass "CSRF token retrieved: ${CSRF_TOKEN:0:20}..."
        else
            print_fail "CSRF token is empty or null"
        fi
    else
        print_fail "CSRF token endpoint returned $STATUS"
    fi
}

# Test 3: User Registration without CSRF (should fail)
test_registration_no_csrf() {
    print_header "Test 3: Registration without CSRF Token"
    print_test "POST /api/auth/register (no CSRF token)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    
    if [ "$STATUS" = "403" ]; then
        print_pass "Registration blocked without CSRF token (403)"
    else
        print_fail "Registration should have been blocked, got $STATUS"
    fi
}

# Test 4: User Registration with CSRF
test_registration_with_csrf() {
    print_header "Test 4: Registration with CSRF Token"
    print_test "POST /api/auth/register (with CSRF token)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt \
        -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $CSRF_TOKEN" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -1)
    
    if [ "$STATUS" = "201" ]; then
        JWT_TOKEN=$(echo "$BODY" | jq -r '.token')
        USER_ID=$(echo "$BODY" | jq -r '.user.id')
        print_pass "User registered successfully"
        print_info "User ID: $USER_ID"
        print_info "JWT Token: ${JWT_TOKEN:0:30}..."
    else
        print_fail "Registration failed with status $STATUS"
        print_info "Response: $BODY"
    fi
}

# Test 5: Weak Password Rejection
test_weak_password() {
    print_header "Test 5: Weak Password Rejection"
    print_test "POST /api/auth/register (weak password)"
    
    WEAK_EMAIL="weak-$(date +%s)@example.com"
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt \
        -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $CSRF_TOKEN" \
        -d "{\"email\":\"$WEAK_EMAIL\",\"password\":\"weak\",\"name\":\"Weak User\"}")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    
    if [ "$STATUS" = "400" ]; then
        print_pass "Weak password rejected (400)"
    else
        print_fail "Weak password should be rejected, got $STATUS"
    fi
}

# Test 6: User Login
test_login() {
    print_header "Test 6: User Login"
    print_test "POST /api/auth/login"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt \
        -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $CSRF_TOKEN" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -1)
    
    if [ "$STATUS" = "200" ]; then
        JWT_TOKEN=$(echo "$BODY" | jq -r '.token')
        print_pass "Login successful"
        print_info "JWT Token: ${JWT_TOKEN:0:30}..."
    else
        print_fail "Login failed with status $STATUS"
    fi
}

# Test 7: Invalid Credentials
test_invalid_credentials() {
    print_header "Test 7: Invalid Credentials"
    print_test "POST /api/auth/login (wrong password)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt \
        -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $CSRF_TOKEN" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword123\"}")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    
    if [ "$STATUS" = "401" ]; then
        print_pass "Invalid credentials rejected (401)"
    else
        print_fail "Invalid credentials should return 401, got $STATUS"
    fi
}

# Test 8: Protected Route without Token
test_protected_no_token() {
    print_header "Test 8: Protected Route without Token"
    print_test "GET /api/auth/me (no token)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/me")
    STATUS=$(echo "$RESPONSE" | tail -1)
    
    if [ "$STATUS" = "401" ]; then
        print_pass "Protected route blocked without token (401)"
    else
        print_fail "Protected route should require auth, got $STATUS"
    fi
}

# Test 9: Protected Route with Valid Token
test_protected_with_token() {
    print_header "Test 9: Protected Route with Token"
    print_test "GET /api/auth/me (with token)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        "$BASE_URL/api/auth/me")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -1)
    
    if [ "$STATUS" = "200" ]; then
        EMAIL=$(echo "$BODY" | jq -r '.user.email')
        if [ "$EMAIL" = "$TEST_EMAIL" ]; then
            print_pass "Protected route accessible with valid token"
        else
            print_fail "Email mismatch: expected $TEST_EMAIL, got $EMAIL"
        fi
    else
        print_fail "Protected route returned $STATUS"
    fi
}

# Test 10: Rate Limiting
test_rate_limiting() {
    print_header "Test 10: Rate Limiting"
    print_test "Multiple requests to test rate limiting"
    
    print_info "Sending 105 requests (limit is 100)..."
    
    RATE_LIMITED=0
    for i in {1..105}; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
        if [ "$STATUS" = "429" ]; then
            RATE_LIMITED=1
            break
        fi
    done
    
    if [ $RATE_LIMITED -eq 1 ]; then
        print_pass "Rate limiting triggered (429 Too Many Requests)"
    else
        print_fail "Rate limiting did not trigger after 105 requests"
    fi
    
    # Wait for rate limit to reset
    print_info "Waiting 2 seconds for rate limit window..."
    sleep 2
}

# Test 11: Security Headers
test_security_headers() {
    print_header "Test 11: Security Headers"
    print_test "Checking security headers"
    
    HEADERS=$(curl -s -I "$BASE_URL/health")
    
    # Check for critical headers
    if echo "$HEADERS" | grep -q "X-Frame-Options"; then
        print_pass "X-Frame-Options header present"
    else
        print_fail "X-Frame-Options header missing"
    fi
    
    if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
        print_pass "Strict-Transport-Security header present"
    else
        print_fail "Strict-Transport-Security header missing"
    fi
    
    if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
        print_pass "X-Content-Type-Options header present"
    else
        print_fail "X-Content-Type-Options header missing"
    fi
}

# Test 12: XSS Protection
test_xss_protection() {
    print_header "Test 12: XSS Protection"
    print_test "Attempting XSS injection in user input"
    
    XSS_EMAIL="xss-$(date +%s)@example.com"
    XSS_NAME="<script>alert('XSS')</script>"
    
    # Get fresh CSRF token
    CSRF_TOKEN=$(curl -s -b cookies.txt "$BASE_URL/api/auth/csrf-token" | jq -r '.csrfToken')
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt \
        -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $CSRF_TOKEN" \
        -d "{\"email\":\"$XSS_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$XSS_NAME\"}")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -1)
    
    if [ "$STATUS" = "201" ]; then
        NAME=$(echo "$BODY" | jq -r '.user.name')
        if echo "$NAME" | grep -q "<script>"; then
            print_fail "XSS payload not sanitized: $NAME"
        else
            print_pass "XSS payload sanitized"
        fi
    else
        print_info "Registration rejected (may be due to validation): $STATUS"
    fi
}

# Test 13: SQL Injection Protection
test_sql_injection() {
    print_header "Test 13: SQL Injection Protection"
    print_test "Attempting SQL injection in login"
    
    SQL_EMAIL="admin' OR '1'='1"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt \
        -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -H "X-CSRF-Token: $CSRF_TOKEN" \
        -d "{\"email\":\"$SQL_EMAIL\",\"password\":\"anything\"}")
    
    STATUS=$(echo "$RESPONSE" | tail -1)
    
    if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
        print_pass "SQL injection attempt blocked ($STATUS)"
    else
        print_fail "SQL injection might have succeeded: $STATUS"
    fi
}

# Test 14: Metrics Endpoint
test_metrics() {
    print_header "Test 14: Metrics Endpoint"
    print_test "GET /metrics"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/metrics")
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -1)
    
    if [ "$STATUS" = "200" ]; then
        if echo "$BODY" | grep -q "http_requests_total"; then
            print_pass "Metrics endpoint working"
        else
            print_fail "Metrics format invalid"
        fi
    else
        print_fail "Metrics endpoint returned $STATUS"
    fi
}

# Test 15: API Documentation
test_api_docs() {
    print_header "Test 15: API Documentation"
    print_test "GET /api-docs"
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api-docs")
    
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ]; then
        print_pass "API documentation accessible"
    else
        print_fail "API documentation returned $STATUS"
    fi
}

# Run all tests
main() {
    print_header "Zekka Framework - Security Test Suite"
    print_info "Base URL: $BASE_URL"
    print_info "Test Email: $TEST_EMAIL"
    
    # Pre-flight check
    print_info "Checking if server is running..."
    if ! curl -s -f "$BASE_URL/health" > /dev/null; then
        echo -e "${RED}ERROR: Server is not running at $BASE_URL${NC}"
        echo "Please start the server first: npm run dev"
        exit 1
    fi
    
    # Run tests
    test_health_check
    test_csrf_token
    test_registration_no_csrf
    test_registration_with_csrf
    test_weak_password
    test_login
    test_invalid_credentials
    test_protected_no_token
    test_protected_with_token
    test_rate_limiting
    test_security_headers
    test_xss_protection
    test_sql_injection
    test_metrics
    test_api_docs
    
    # Cleanup
    rm -f cookies.txt
    
    # Summary
    print_header "Test Summary"
    echo -e "Total Tests:  ${BLUE}$TOTAL${NC}"
    echo -e "Passed:       ${GREEN}$PASSED${NC}"
    echo -e "Failed:       ${RED}$FAILED${NC}"
    
    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed! System is secure.${NC}\n"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed. Please review and fix.${NC}\n"
        exit 1
    fi
}

# Run main function
main
