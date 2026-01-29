#!/bin/bash
# ===================================================================
# Vault Initialization Script
# ===================================================================
#
# This script initializes HashiCorp Vault with:
# - AppRole authentication
# - KV v2 secrets engine
# - Initial secrets from .env.production
#
# Usage:
#   ./scripts/vault-init.sh
#
# Prerequisites:
#   - Vault must be running (docker-compose up vault)
#   - vault CLI installed (optional, uses docker exec if not)
#
# Author: Zekka Technologies
# Version: 1.0.0
# ===================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_DEV_ROOT_TOKEN:-zekka-dev-token}"
VAULT_CONTAINER="${VAULT_CONTAINER:-zekka-vault-prod}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Zekka Framework - Vault Initialization        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if vault CLI is available
if command -v vault &> /dev/null; then
    VAULT_CMD="vault"
    export VAULT_ADDR
    export VAULT_TOKEN
    echo -e "${GREEN}✓${NC} Using local vault CLI"
else
    VAULT_CMD="docker exec -e VAULT_TOKEN=$VAULT_TOKEN $VAULT_CONTAINER vault"
    echo -e "${YELLOW}⚠${NC} vault CLI not found, using docker exec"
fi

# Wait for Vault to be ready
echo -e "${BLUE}⏳${NC} Waiting for Vault to be ready..."
for i in {1..30}; do
    if curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Vault is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗${NC} Vault failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# Enable AppRole auth if not already enabled
echo ""
echo -e "${BLUE}📋${NC} Configuring AppRole authentication..."
if $VAULT_CMD auth list | grep -q "approle"; then
    echo -e "${YELLOW}⚠${NC} AppRole already enabled"
else
    $VAULT_CMD auth enable approle
    echo -e "${GREEN}✓${NC} AppRole authentication enabled"
fi

# Enable KV v2 secrets engine if not already enabled
echo ""
echo -e "${BLUE}📋${NC} Configuring KV v2 secrets engine..."
if $VAULT_CMD secrets list | grep -q "kv/"; then
    echo -e "${YELLOW}⚠${NC} KV secrets engine already enabled"
else
    $VAULT_CMD secrets enable -path=kv kv-v2
    echo -e "${GREEN}✓${NC} KV v2 secrets engine enabled at 'kv/'"
fi

# Create Zekka policy
echo ""
echo -e "${BLUE}📋${NC} Creating Zekka access policy..."

# Create policy file
cat > /tmp/zekka-policy.hcl <<EOF
# KV v2 secrets access
path "kv/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "kv/metadata/*" {
  capabilities = ["list", "read", "delete"]
}

# Token renewal
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Token lookup (for health checks)
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
EOF

# Upload policy to Vault
if command -v vault &> /dev/null; then
    vault policy write zekka-policy /tmp/zekka-policy.hcl
else
    docker cp /tmp/zekka-policy.hcl $VAULT_CONTAINER:/tmp/zekka-policy.hcl
    docker exec -e VAULT_TOKEN=$VAULT_TOKEN $VAULT_CONTAINER vault policy write zekka-policy /tmp/zekka-policy.hcl
fi

rm -f /tmp/zekka-policy.hcl
echo -e "${GREEN}✓${NC} Policy 'zekka-policy' created"

# Create AppRole
echo ""
echo -e "${BLUE}📋${NC} Creating AppRole 'zekka-app'..."
$VAULT_CMD write auth/approle/role/zekka-app \
    token_ttl=1h \
    token_max_ttl=4h \
    policies="zekka-policy" \
    bind_secret_id=true \
    secret_id_ttl=0

echo -e "${GREEN}✓${NC} AppRole 'zekka-app' created"

# Get Role ID
echo ""
echo -e "${BLUE}📋${NC} Retrieving AppRole credentials..."
ROLE_ID=$($VAULT_CMD read -field=role_id auth/approle/role/zekka-app/role-id)
SECRET_ID=$($VAULT_CMD write -field=secret_id -f auth/approle/role/zekka-app/secret-id)

echo -e "${GREEN}✓${NC} Role ID: ${ROLE_ID}"
echo -e "${GREEN}✓${NC} Secret ID: ${SECRET_ID:0:20}...${SECRET_ID: -10}"

# Write credentials to .env file
echo ""
echo -e "${BLUE}📋${NC} Writing credentials to .env..."
if [ ! -f .env ]; then
    touch .env
fi

# Remove old Vault credentials if they exist
sed -i '/^VAULT_/d' .env

# Add new credentials
cat >> .env <<EOF

# HashiCorp Vault Configuration
VAULT_ENABLED=true
VAULT_ADDR=${VAULT_ADDR}
VAULT_ROLE_ID=${ROLE_ID}
VAULT_SECRET_ID=${SECRET_ID}
VAULT_MOUNT_PATH=kv
VAULT_CACHE_TTL=300000
EOF

echo -e "${GREEN}✓${NC} Vault credentials written to .env"

# Import secrets from .env.production if it exists
echo ""
if [ -f .env.production ]; then
    echo -e "${BLUE}📋${NC} Importing secrets from .env.production..."

    # Parse .env.production and import secrets
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        # Remove quotes and whitespace
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e 's/^'"'"'//' -e 's/'"'"'$//' | xargs)

        # Determine vault path based on key
        case "$key" in
            DATABASE_URL)
                $VAULT_CMD kv put kv/database url="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/database"
                ;;
            REDIS_PASSWORD)
                $VAULT_CMD kv put kv/redis password="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/redis"
                ;;
            JWT_SECRET|SESSION_SECRET|ENCRYPTION_KEY)
                $VAULT_CMD kv put kv/auth/$key value="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/auth/$key"
                ;;
            GITHUB_TOKEN)
                $VAULT_CMD kv put kv/api/github token="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/api/github"
                ;;
            ANTHROPIC_API_KEY)
                $VAULT_CMD kv put kv/api/anthropic key="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/api/anthropic"
                ;;
            OPENAI_API_KEY)
                $VAULT_CMD kv put kv/api/openai key="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/api/openai"
                ;;
            GEMINI_API_KEY)
                $VAULT_CMD kv put kv/api/gemini key="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/api/gemini"
                ;;
            WEBHOOK_SECRET)
                $VAULT_CMD kv put kv/webhooks secret="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/webhooks"
                ;;
            GRAFANA_ADMIN_PASSWORD)
                $VAULT_CMD kv put kv/grafana admin_password="$value"
                echo -e "${GREEN}✓${NC} Imported $key → kv/grafana"
                ;;
        esac
    done < .env.production

    echo -e "${GREEN}✓${NC} Secrets imported from .env.production"
else
    echo -e "${YELLOW}⚠${NC} .env.production not found, skipping secret import"
    echo -e "${YELLOW}⚠${NC} You'll need to manually add secrets to Vault"
fi

# Print summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Vault Initialization Complete             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓${NC} Vault is configured and ready to use"
echo -e "${GREEN}✓${NC} AppRole credentials saved to .env"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "  • Keep your .env file secure and never commit it to git"
echo -e "  • Restart your application to use Vault: docker-compose restart app"
echo -e "  • View secrets: vault kv get kv/database"
echo -e "  • Vault UI: ${VAULT_ADDR}/ui (token: ${VAULT_TOKEN})"
echo ""
