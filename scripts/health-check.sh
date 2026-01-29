#!/bin/sh
# Health check script for Zekka Framework
# This script verifies the application is running and responding

set -e

# Configuration
HOST="${HOST:-localhost}"
PORT="${PORT:-3000}"
ENDPOINT="${ENDPOINT:-/health}"
TIMEOUT="${TIMEOUT:-5}"

# Perform health check
check_health() {
    if command -v wget >/dev/null 2>&1; then
        wget --no-verbose --tries=1 --timeout="$TIMEOUT" --spider "http://${HOST}:${PORT}${ENDPOINT}" 2>&1
        return $?
    elif command -v curl >/dev/null 2>&1; then
        curl -sf --max-time "$TIMEOUT" "http://${HOST}:${PORT}${ENDPOINT}" > /dev/null 2>&1
        return $?
    else
        echo "ERROR: Neither wget nor curl is available"
        return 1
    fi
}

# Execute health check
if check_health; then
    echo "✓ Health check passed"
    exit 0
else
    echo "✗ Health check failed"
    exit 1
fi
