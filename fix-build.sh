#!/bin/bash

# Quick fix for missing package-lock.json
echo "🔧 Fixing Zekka Framework build issue..."

# Navigate to Zekka directory
cd ~/Zekka 2>/dev/null || cd ~/Desktop/Zekka 2>/dev/null || cd Zekka 2>/dev/null

# Create package-lock.json by running npm install
echo "📦 Generating package-lock.json..."
npm install --package-lock-only

# Update Dockerfiles to use npm install instead of npm ci
echo "🔨 Updating Dockerfiles..."

# Fix main Dockerfile
if [ -f "Dockerfile" ]; then
    sed -i 's/npm ci --only=production/npm install --omit=dev/' Dockerfile
    echo "✅ Updated Dockerfile"
fi

# Fix arbitrator Dockerfile
if [ -f "Dockerfile.arbitrator" ]; then
    sed -i 's/npm ci --only=production/npm install --omit=dev/' Dockerfile.arbitrator
    echo "✅ Updated Dockerfile.arbitrator"
fi

echo ""
echo "🎉 Fix complete! Now run:"
echo "   ./setup.sh"
