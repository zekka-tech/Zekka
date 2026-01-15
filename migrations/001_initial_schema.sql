-- ===================================================================
-- Zekka Framework - Initial Database Schema
-- Migration 001: Core Tables and Base Security
-- ===================================================================
--
-- This migration creates the foundational database structure for
-- the Zekka Framework including:
-- 1. Users and authentication
-- 2. Sessions management
-- 3. API keys
-- 4. Roles and permissions (RBAC)
-- 5. Core audit logging
--
-- Standards Compliance:
-- - OWASP Top 10
-- - SOC 2 Type II baseline
-- - GDPR Article 5 (Principles for processing personal data)
-- ===================================================================

-- ===================================================================
-- 1. USERS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile Information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url TEXT,
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    
    -- Password Management
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Email Verification
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Comments
COMMENT ON TABLE users IS 'User accounts with authentication and profile information';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (rounds: 12)';
COMMENT ON COLUMN users.is_locked IS 'Account locked due to security concerns or excessive failed logins';

-- ===================================================================
-- 2. SESSIONS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Data
    data JSONB,
    
    -- Request Information
    ip_address INET NOT NULL,
    user_agent TEXT,
    
    -- Security
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoke_reason VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_revoked ON sessions(is_revoked) WHERE is_revoked = false;

-- Comments
COMMENT ON TABLE sessions IS 'Active user sessions with security tracking';

-- ===================================================================
-- 3. ROLES TABLE (RBAC)
-- ===================================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    level INTEGER DEFAULT 0, -- 0=user, 10=moderator, 50=admin, 100=superadmin
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System roles cannot be deleted
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_level ON roles(level);

-- Comments
COMMENT ON TABLE roles IS 'Role-based access control (RBAC) roles';

-- ===================================================================
-- 4. PERMISSIONS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL, -- e.g., 'users', 'posts', 'api'
    action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Comments
COMMENT ON TABLE permissions IS 'Fine-grained permissions for RBAC';

-- ===================================================================
-- 5. ROLE PERMISSIONS (Many-to-Many)
-- ===================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- Indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Comments
COMMENT ON TABLE role_permissions IS 'Maps roles to their permissions';

-- ===================================================================
-- 6. USER ROLES (Many-to-Many)
-- ===================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional: temporary role assignment
    PRIMARY KEY (user_id, role_id)
);

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE user_roles IS 'Maps users to their assigned roles';

-- ===================================================================
-- 7. API KEYS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Key Information
    key_hash VARCHAR(255) UNIQUE NOT NULL, -- SHA-256 hash of the key
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permissions
    scopes TEXT[], -- Array of permission scopes
    
    -- Rate Limiting
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage Tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    usage_count INTEGER DEFAULT 0,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key for secure storage';

-- ===================================================================
-- 8. BASIC AUDIT LOG TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS audit_log_basic (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    details JSONB
);

-- Indexes
CREATE INDEX idx_audit_log_basic_timestamp ON audit_log_basic(timestamp DESC);
CREATE INDEX idx_audit_log_basic_user_id ON audit_log_basic(user_id);
CREATE INDEX idx_audit_log_basic_action ON audit_log_basic(action);

-- Comments
COMMENT ON TABLE audit_log_basic IS 'Basic audit logging (enhanced in migration 002)';

-- ===================================================================
-- 9. SEED DEFAULT ROLES
-- ===================================================================

INSERT INTO roles (name, display_name, description, level, is_system) VALUES
    ('superadmin', 'Super Administrator', 'Full system access', 100, true),
    ('admin', 'Administrator', 'Administrative access', 50, true),
    ('moderator', 'Moderator', 'Content moderation', 10, true),
    ('user', 'User', 'Standard user access', 0, true)
ON CONFLICT (name) DO NOTHING;

-- ===================================================================
-- 10. SEED DEFAULT PERMISSIONS
-- ===================================================================

INSERT INTO permissions (name, display_name, description, resource, action) VALUES
    -- Users
    ('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
    ('users.read', 'View Users', 'View user information', 'users', 'read'),
    ('users.update', 'Update Users', 'Update user information', 'users', 'update'),
    ('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete'),
    
    -- Roles
    ('roles.manage', 'Manage Roles', 'Manage roles and permissions', 'roles', 'manage'),
    
    -- API Keys
    ('api_keys.create', 'Create API Keys', 'Create new API keys', 'api_keys', 'create'),
    ('api_keys.read', 'View API Keys', 'View API keys', 'api_keys', 'read'),
    ('api_keys.revoke', 'Revoke API Keys', 'Revoke API keys', 'api_keys', 'revoke'),
    
    -- Audit Logs
    ('audit.read', 'View Audit Logs', 'View audit logs', 'audit', 'read'),
    
    -- System
    ('system.admin', 'System Administration', 'Full system administration', 'system', 'admin')
ON CONFLICT (name) DO NOTHING;

-- ===================================================================
-- 11. ASSIGN PERMISSIONS TO ROLES
-- ===================================================================

-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- Admin: Most permissions except system.admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' AND p.name != 'system.admin'
ON CONFLICT DO NOTHING;

-- Moderator: Read users, manage content
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'moderator' AND p.name IN ('users.read', 'audit.read')
ON CONFLICT DO NOTHING;

-- User: Basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user' AND p.name IN ('users.read', 'api_keys.create', 'api_keys.read')
ON CONFLICT DO NOTHING;

-- ===================================================================
-- 12. FUNCTIONS AND TRIGGERS
-- ===================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for roles table
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- 13. INITIAL DATABASE STATISTICS
-- ===================================================================

-- Analyze tables for query optimization
ANALYZE users;
ANALYZE sessions;
ANALYZE roles;
ANALYZE permissions;
ANALYZE role_permissions;
ANALYZE user_roles;
ANALYZE api_keys;
ANALYZE audit_log_basic;

-- ===================================================================
-- MIGRATION 001 COMPLETE
-- ===================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 001 completed successfully';
    RAISE NOTICE 'Created: users, sessions, roles, permissions, api_keys, audit_log_basic';
    RAISE NOTICE 'Default roles: superadmin, admin, moderator, user';
    RAISE NOTICE 'Default permissions: 10 permissions created';
END $$;
