#!/bin/bash

# Zekka Framework - Beginner-Friendly Setup Script
# This script will guide you through the complete setup process

set -e  # Exit on error

echo "========================================="
echo "🚀 Zekka Framework Setup"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating environment configuration..."
    cp .env.example .env
    
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Please configure your API keys in .env file${NC}"
    echo ""
    echo "Required steps:"
    echo "1. Get GitHub token from: https://github.com/settings/tokens"
    echo "   - Required permissions: repo, workflow"
    echo ""
    echo "2. (Optional) Get Anthropic API key from: https://console.anthropic.com/"
    echo "   - This enables Claude for better conflict resolution"
    echo ""
    echo "3. Edit .env file with your tokens:"
    echo "   nano .env  (or use your preferred editor)"
    echo ""
    read -p "Press Enter when you've configured .env file..."
fi

# Verify .env has at least GitHub token
if ! grep -q "ghp_" .env; then
    echo -e "${YELLOW}⚠️  Warning: No GitHub token found in .env${NC}"
    echo "The system will work, but GitHub integration won't function."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🐳 Starting Docker containers..."
echo "This may take a few minutes on first run..."
echo ""

# Pull and start containers
docker-compose pull
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U zekka > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for Redis
echo -n "Waiting for Redis..."
for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for Ollama
echo -n "Waiting for Ollama..."
for i in {1..60}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Pull Ollama models
echo ""
echo "📥 Downloading AI models (this may take 5-10 minutes)..."
echo ""

echo "Pulling llama3.1:8b..."
docker-compose exec -T ollama ollama pull llama3.1:8b

echo "Pulling mistral..."
docker-compose exec -T ollama ollama pull mistral

echo "Pulling codellama..."
docker-compose exec -T ollama ollama pull codellama

# Wait for main application
echo ""
echo -n "Waiting for Orchestrator..."
for i in {1..60}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for Arbitrator
echo -n "Waiting for Arbitrator..."
for i in {1..60}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "========================================="
echo -e "${GREEN}🎉 Zekka Framework is ready!${NC}"
echo "========================================="
echo ""
echo "📊 Access the dashboard:"
echo "   👉 http://localhost:3000"
echo ""
echo "🤖 API endpoints:"
echo "   • Health: http://localhost:3000/health"
echo "   • API:    http://localhost:3000/api"
echo "   • Arbitrator: http://localhost:3001"
echo ""
echo "📚 Useful commands:"
echo "   • View logs:     docker-compose logs -f"
echo "   • Stop system:   docker-compose down"
echo "   • Restart:       docker-compose restart"
echo "   • Full reset:    docker-compose down -v"
echo ""
echo "💡 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Create a new project in the dashboard"
echo "   3. Watch the multi-agent system work!"
echo ""
echo "📖 For more help, see README.md"
echo ""
