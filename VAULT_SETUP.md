# HashiCorp Vault Integration

This document explains how to use HashiCorp Vault for secure secrets management in the Zekka Framework.

## Overview

Zekka now integrates with HashiCorp Vault to securely manage secrets like:
- Database credentials
- API keys (GitHub, Anthropic, OpenAI, Gemini)
- JWT secrets and encryption keys
- Redis passwords
- Webhook secrets

## Why Vault?

✅ **No Hardcoded Secrets**: Secrets never appear in source code
✅ **Centralized Management**: All secrets in one secure location
✅ **Access Control**: Fine-grained policies for who can access what
✅ **Audit Logging**: Track who accessed which secrets when
✅ **Secret Rotation**: Easily rotate credentials without code changes
✅ **Encryption**: All secrets encrypted at rest and in transit

## Quick Start

### 1. Start Vault

Vault is included in `docker-compose.yml`:

```bash
docker-compose up -d vault
```

Vault will be available at: http://localhost:8200

### 2. Initialize Vault with Your Secrets

Run the initialization script to:
- Enable AppRole authentication
- Create KV v2 secrets engine
- Import secrets from `.env.production`
- Generate AppRole credentials

```bash
./scripts/vault-init.sh
```

This script will:
1. Configure Vault with proper auth methods and policies
2. Import your existing secrets from `.env.production`
3. Generate `VAULT_ROLE_ID` and `VAULT_SECRET_ID`
4. Save credentials to your `.env` file

### 3. Enable Vault in Your Application

Update your `.env` file:

```bash
VAULT_ENABLED=true
VAULT_ADDR=http://localhost:8200
```

The `vault-init.sh` script already adds these for you.

### 4. Restart Your Application

```bash
docker-compose restart app
```

Your application will now fetch secrets from Vault instead of environment variables.

## Architecture

```
┌─────────────────┐
│  Zekka App      │
│                 │
│  VaultService   │──────┐
│  - Auth         │      │
│  - Get Secrets  │      │
│  - Cache        │      │
└─────────────────┘      │
                         │
                         ▼
                 ┌───────────────┐
                 │  Vault Server │
                 │               │
                 │  AppRole Auth │
                 │  KV v2 Engine │
                 │  Encryption   │
                 └───────────────┘
```

### Components

1. **VaultService** (`src/services/vault-service.js`)
   - Handles authentication with AppRole
   - Fetches secrets from KV v2 engine
   - Implements caching for performance
   - Auto-renews tokens

2. **Vault Config** (`src/config/vault.js`)
   - Singleton Vault instance
   - Helper functions for common operations
   - Fallback to environment variables if Vault unavailable

3. **Vault Init Script** (`scripts/vault-init.sh`)
   - Automates Vault setup
   - Imports existing secrets
   - Generates AppRole credentials

## Secret Organization

Secrets are organized in Vault by category:

```
kv/
├── database/
│   └── url                    # DATABASE_URL
├── redis/
│   └── password               # REDIS_PASSWORD
├── auth/
│   ├── JWT_SECRET
│   ├── SESSION_SECRET
│   └── ENCRYPTION_KEY
├── api/
│   ├── github/
│   │   └── token             # GITHUB_TOKEN
│   ├── anthropic/
│   │   └── key               # ANTHROPIC_API_KEY
│   ├── openai/
│   │   └── key               # OPENAI_API_KEY
│   └── gemini/
│       └── key               # GEMINI_API_KEY
├── webhooks/
│   └── secret                # WEBHOOK_SECRET
└── grafana/
    └── admin_password        # GRAFANA_ADMIN_PASSWORD
```

## Usage Examples

### Reading Secrets in Code

```javascript
const { getVaultSecret } = require('./config/vault');

// Get entire secret object
const dbCreds = await getVaultSecret('database/url', 'DATABASE_URL');

// Get specific field from secret
const githubToken = await getVaultSecret(
  'api/github',
  'GITHUB_TOKEN',
  'token'
);
```

### Writing Secrets to Vault

```javascript
const { getVault } = require('./config/vault');

const vault = getVault();
await vault.setSecret('database/credentials', {
  username: 'admin',
  password: 'new-secure-password'
});
```

### Fallback Behavior

If Vault is not available, the application automatically falls back to environment variables:

```javascript
// Tries Vault first, falls back to process.env.DATABASE_URL
const dbUrl = await getVaultSecret('database/url', 'DATABASE_URL');
```

## Manual Vault Operations

### Using Vault CLI

Install Vault CLI: https://www.vaultproject.io/downloads

```bash
# Set environment variables
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=zekka-dev-token

# List secrets
vault kv list kv

# Read a secret
vault kv get kv/database

# Write a secret
vault kv put kv/api/github token="ghp_newtoken123"

# Delete a secret
vault kv delete kv/api/github
```

### Using Vault UI

1. Open http://localhost:8200/ui
2. Sign in with token: `zekka-dev-token` (default dev token)
3. Navigate to `kv/` secrets engine
4. View, edit, or create secrets

### Using Docker Exec

If you don't have Vault CLI installed:

```bash
# Read a secret
docker exec -e VAULT_TOKEN=zekka-dev-token zekka-vault \
  vault kv get kv/database

# Write a secret
docker exec -e VAULT_TOKEN=zekka-dev-token zekka-vault \
  vault kv put kv/api/github token="ghp_newtoken123"
```

## Security Best Practices

### Development Environment

✅ Use dev mode (already configured in `docker-compose.yml`)
✅ Keep `VAULT_DEV_ROOT_TOKEN` secret
✅ Never commit `.env` or `.env.production` to git

### Production Environment

1. **Use Production Mode**: Don't use `-dev` flag
   ```yaml
   # docker-compose.yml
   vault:
     command: server
     # Not: server -dev
   ```

2. **Initialize Vault Properly**:
   ```bash
   vault operator init
   # Save unseal keys and root token securely!
   ```

3. **Unseal Vault**: Required after restart
   ```bash
   vault operator unseal
   ```

4. **Use TLS**: Always use HTTPS in production
   ```bash
   VAULT_ADDR=https://vault.yourcompany.com
   ```

5. **Rotate Credentials**: Regular rotation of:
   - AppRole Secret IDs
   - Database passwords
   - API keys

6. **Enable Audit Logging**:
   ```bash
   vault audit enable file file_path=/vault/logs/audit.log
   ```

7. **Use Policies**: Restrict access with fine-grained policies
   ```hcl
   # Only read database secrets
   path "kv/data/database/*" {
     capabilities = ["read"]
   }
   ```

## Troubleshooting

### Vault Not Starting

**Problem**: Vault container fails to start

**Solution**:
```bash
# Check logs
docker-compose logs vault

# Restart Vault
docker-compose restart vault

# Recreate if needed
docker-compose down vault
docker-compose up -d vault
```

### Authentication Failed

**Problem**: `Vault authentication failed: permission denied`

**Solution**:
```bash
# Re-run initialization script
./scripts/vault-init.sh

# Verify credentials in .env
cat .env | grep VAULT_
```

### Secrets Not Found

**Problem**: `Failed to get secret: secret not found`

**Solution**:
```bash
# Check if secret exists
vault kv get kv/path/to/secret

# List all secrets
vault kv list kv

# Re-import from .env.production
./scripts/vault-init.sh
```

### Application Falls Back to Env Vars

**Problem**: App logs show "using fallback env var"

**Solution**:
```bash
# Check Vault health
curl http://localhost:8200/v1/sys/health

# Verify VAULT_ENABLED=true in .env
grep VAULT_ENABLED .env

# Check Vault service is running
docker-compose ps vault
```

### Token Expired

**Problem**: `Token has expired`

**Solution**:
```bash
# Restart application to get new token
docker-compose restart app

# Or regenerate AppRole credentials
./scripts/vault-init.sh
```

## Migration Guide

### Migrating from Environment Variables

1. **Keep existing setup working**:
   - Leave `.env` and `.env.production` as-is
   - Vault falls back to env vars if unavailable

2. **Initialize Vault**:
   ```bash
   ./scripts/vault-init.sh
   ```
   This imports your existing secrets.

3. **Test Vault integration**:
   ```bash
   VAULT_ENABLED=true docker-compose restart app
   ```

4. **Verify application works**:
   ```bash
   curl http://localhost:3000/health
   ```

5. **Once stable, clean up**:
   - Remove secrets from `.env.production`
   - Keep only non-sensitive config in env files

### Rolling Back

If you need to disable Vault:

```bash
# In .env
VAULT_ENABLED=false

# Restart app
docker-compose restart app
```

The app will automatically use environment variables again.

## References

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault KV v2 Secrets Engine](https://www.vaultproject.io/docs/secrets/kv/kv-v2)
- [AppRole Auth Method](https://www.vaultproject.io/docs/auth/approle)
- [Vault Best Practices](https://learn.hashicorp.com/tutorials/vault/production-hardening)

## Support

If you encounter issues with Vault integration:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Vault logs: `docker-compose logs vault`
3. Review app logs: `docker-compose logs app`
4. Open an issue on GitHub with logs and error messages

---

**Note**: This integration is designed for flexibility. Vault is optional - the application works with or without it, automatically falling back to environment variables when needed.
