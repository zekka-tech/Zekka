#!/bin/bash
#
# Production Readiness Test Suite
# Comprehensive testing for production deployment
#

set -e  # Exit on error

echo "🚀 Zekka Framework - Production Readiness Tests"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Function to print test result
print_result() {
  local test_name=$1
  local result=$2
  local message=$3
  
  if [ "$result" = "PASS" ]; then
    echo -e "${GREEN}✓${NC} $test_name"
    ((PASSED++))
  elif [ "$result" = "FAIL" ]; then
    echo -e "${RED}✗${NC} $test_name: $message"
    ((FAILED++))
  else
    echo -e "${YELLOW}⚠${NC} $test_name: $message"
    ((WARNINGS++))
  fi
}

echo "1. Environment Validation Tests"
echo "-------------------------------"

# Check Node.js version
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -ge 16 ]; then
    print_result "Node.js version (v$NODE_VERSION)" "PASS"
  else
    print_result "Node.js version" "FAIL" "Node.js 16+ required"
  fi
else
  print_result "Node.js installed" "FAIL" "Node.js not found"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
  print_result "PostgreSQL installed" "PASS"
else
  print_result "PostgreSQL installed" "WARN" "PostgreSQL not found in PATH"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
  if redis-cli ping &> /dev/null; then
    print_result "Redis running" "PASS"
  else
    print_result "Redis running" "WARN" "Redis not responding"
  fi
else
  print_result "Redis installed" "WARN" "redis-cli not found"
fi

echo ""
echo "2. Dependencies Tests"
echo "--------------------"

# Check package.json exists
if [ -f "package.json" ]; then
  print_result "package.json exists" "PASS"
else
  print_result "package.json exists" "FAIL" "package.json not found"
fi

# Check node_modules installed
if [ -d "node_modules" ]; then
  print_result "Dependencies installed" "PASS"
else
  print_result "Dependencies installed" "FAIL" "Run npm install"
fi

# Check for security vulnerabilities
if command -v npm &> /dev/null; then
  echo "  Running npm audit..."
  if npm audit --audit-level=high &> /dev/null; then
    print_result "No high/critical vulnerabilities" "PASS"
  else
    print_result "Security vulnerabilities found" "WARN" "Run npm audit for details"
  fi
fi

echo ""
echo "3. Configuration Tests"
echo "---------------------"

# Check for required environment variables
if [ -f ".env" ]; then
  print_result ".env file exists" "PASS"
  
  # Check critical variables
  if grep -q "JWT_SECRET" .env && [ -n "$(grep JWT_SECRET .env | cut -d'=' -f2)" ]; then
    print_result "JWT_SECRET configured" "PASS"
  else
    print_result "JWT_SECRET configured" "FAIL" "JWT_SECRET not set"
  fi
  
  if grep -q "DATABASE_URL" .env && [ -n "$(grep DATABASE_URL .env | cut -d'=' -f2)" ]; then
    print_result "DATABASE_URL configured" "PASS"
  else
    print_result "DATABASE_URL configured" "WARN" "DATABASE_URL not set"
  fi
  
  if grep -q "ENCRYPTION_KEY" .env && [ -n "$(grep ENCRYPTION_KEY .env | cut -d'=' -f2)" ]; then
    print_result "ENCRYPTION_KEY configured" "PASS"
  else
    print_result "ENCRYPTION_KEY configured" "FAIL" "ENCRYPTION_KEY not set"
  fi
else
  print_result ".env file exists" "WARN" "Copy .env.example.secure to .env"
fi

echo ""
echo "4. Code Quality Tests"
echo "--------------------"

# Check for console.log statements (excluding node_modules)
CONSOLE_LOGS=$(grep -r "console\.log" src/ --include="*.js" 2>/dev/null | wc -l || echo 0)
if [ "$CONSOLE_LOGS" -lt 10 ]; then
  print_result "Minimal console.log usage" "PASS"
else
  print_result "Console.log statements" "WARN" "Found $CONSOLE_LOGS console.log statements"
fi

# Check for TODO comments
TODOS=$(grep -r "TODO\|FIXME" src/ --include="*.js" 2>/dev/null | wc -l || echo 0)
if [ "$TODOS" -eq 0 ]; then
  print_result "No TODO/FIXME comments" "PASS"
else
  print_result "TODO/FIXME comments" "WARN" "Found $TODOS TODO/FIXME comments"
fi

echo ""
echo "5. Security Tests"
echo "----------------"

# Check for hardcoded secrets
if grep -r "password.*=.*['\"].*['\"]" src/ --include="*.js" 2>/dev/null | grep -v "process.env" | grep -v "example" &> /dev/null; then
  print_result "No hardcoded passwords" "WARN" "Potential hardcoded passwords found"
else
  print_result "No hardcoded passwords" "PASS"
fi

# Check for API keys in code
if grep -r "api.*key.*=.*['\"]" src/ --include="*.js" 2>/dev/null | grep -v "process.env" | grep -v "example" &> /dev/null; then
  print_result "No hardcoded API keys" "WARN" "Potential hardcoded API keys found"
else
  print_result "No hardcoded API keys" "PASS"
fi

# Check for default JWT secret
if grep -r "change-in-production\|default-secret" src/ --include="*.js" 2>/dev/null &> /dev/null; then
  print_result "No default secrets" "FAIL" "Default secrets found in code"
else
  print_result "No default secrets" "PASS"
fi

echo ""
echo "6. File Structure Tests"
echo "----------------------"

# Check for key directories
REQUIRED_DIRS=("src" "src/middleware" "src/utils" "src/services")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    print_result "Directory $dir exists" "PASS"
  else
    print_result "Directory $dir exists" "WARN" "$dir not found"
  fi
done

# Check for key files
REQUIRED_FILES=("src/index.js" "package.json" "README.md")
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    print_result "File $file exists" "PASS"
  else
    print_result "File $file exists" "FAIL" "$file not found"
  fi
done

echo ""
echo "7. Performance Tests"
echo "-------------------"

# Check for large files
LARGE_FILES=$(find src/ -type f -size +1M 2>/dev/null | wc -l || echo 0)
if [ "$LARGE_FILES" -eq 0 ]; then
  print_result "No large source files" "PASS"
else
  print_result "Large source files" "WARN" "Found $LARGE_FILES files > 1MB"
fi

# Check total src size
SRC_SIZE=$(du -sh src/ 2>/dev/null | cut -f1 || echo "0K")
print_result "Source code size: $SRC_SIZE" "PASS"

echo ""
echo "8. Documentation Tests"
echo "---------------------"

# Check for documentation files
DOC_FILES=("README.md" "SECURITY_AUDIT_REPORT.md" "MIGRATION_GUIDE.md")
for doc in "${DOC_FILES[@]}"; do
  if [ -f "$doc" ]; then
    print_result "Documentation: $doc" "PASS"
  else
    print_result "Documentation: $doc" "WARN" "$doc not found"
  fi
done

# Check README content
if [ -f "README.md" ]; then
  if grep -q "Installation\|Setup\|Quick Start" README.md; then
    print_result "README has setup instructions" "PASS"
  else
    print_result "README has setup instructions" "WARN" "Missing setup instructions"
  fi
fi

echo ""
echo "9. Load Testing Preparation"
echo "--------------------------"

# Check if artillery is installed
if command -v artillery &> /dev/null; then
  print_result "Artillery installed" "PASS"
  
  # Check if load test config exists
  if [ -f "load-test.yml" ]; then
    print_result "Load test configuration exists" "PASS"
    echo "  To run load tests: artillery run load-test.yml"
  else
    print_result "Load test configuration" "WARN" "load-test.yml not found"
  fi
else
  print_result "Artillery installed" "WARN" "Install with: npm install -g artillery"
fi

echo ""
echo "10. Production Deployment Checklist"
echo "-----------------------------------"

# Check if production scripts exist
if grep -q "\"start:prod\"" package.json; then
  print_result "Production start script exists" "PASS"
else
  print_result "Production start script" "WARN" "Add start:prod script"
fi

# Check if build script exists
if grep -q "\"build\"" package.json; then
  print_result "Build script exists" "PASS"
else
  print_result "Build script" "WARN" "Add build script"
fi

echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo -e "${RED}✗ Failed:${NC} $FAILED"
echo ""

# Exit code based on failures
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}❌ Production readiness check FAILED${NC}"
  echo "Please fix the failed tests before deploying to production."
  exit 1
elif [ "$WARNINGS" -gt 5 ]; then
  echo -e "${YELLOW}⚠️  Production readiness check passed with WARNINGS${NC}"
  echo "Review warnings before deploying to production."
  exit 0
else
  echo -e "${GREEN}✅ Production readiness check PASSED${NC}"
  echo "System is ready for production deployment!"
  exit 0
fi
