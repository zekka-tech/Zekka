-- =====================================================
-- Migration: 003 - User and Authentication Tables
-- =====================================================
-- Description: Create comprehensive user management and authentication tables
-- Author: Zekka Framework Team
-- Date: 2024-01-22
-- Dependencies: 001_initial_schema.sql, 002_session2_security_enhancements.sql
-- =====================================================

BEGIN;

-- =====================================================
-- Users Table (Core User Information)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Profile Information
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    company VARCHAR(255),
    location VARCHAR(255),
    website VARCHAR(255),

    -- Account Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'pending', 'deleted')),
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    backup_codes TEXT[], -- Encrypted backup codes

    -- Preferences
    timezone VARCHAR(100) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(50) DEFAULT 'light',
    preferences JSONB DEFAULT '{}'::jsonb,

    -- Usage Tracking
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login_at);
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);

-- =====================================================
-- User Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session Information
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,

    -- Device & Location
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet', 'api'
    device_name VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    user_agent TEXT,

    -- Geolocation
    country VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Session Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    invalidated_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for user_sessions table
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity_at);
CREATE INDEX idx_sessions_ip_address ON user_sessions(ip_address);

-- =====================================================
-- Password Reset Tokens Table
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Tracking
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for password_reset_tokens table
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token) WHERE NOT used;
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at) WHERE NOT used;

-- =====================================================
-- Email Verification Tokens Table
-- =====================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Tracking
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for email_verification_tokens table
CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_token ON email_verification_tokens(token) WHERE NOT verified;
CREATE INDEX idx_email_verification_expires ON email_verification_tokens(expires_at) WHERE NOT verified;

-- =====================================================
-- User Roles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    -- Permissions (bitwise flags or JSON)
    permissions JSONB DEFAULT '{}'::jsonb,

    -- Hierarchy
    priority INTEGER DEFAULT 0, -- Higher = more privileged

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_roles table
CREATE INDEX idx_user_roles_name ON user_roles(name);
CREATE INDEX idx_user_roles_priority ON user_roles(priority);
CREATE UNIQUE INDEX idx_user_roles_name_unique ON user_roles(name) WHERE is_active = TRUE;

-- Insert default roles
INSERT INTO user_roles (name, description, permissions, priority, is_system) VALUES
    ('admin', 'System Administrator', '{"all": true}'::jsonb, 1000, TRUE),
    ('manager', 'Project Manager', '{"projects": {"create": true, "read": true, "update": true, "delete": true}, "users": {"read": true}}'::jsonb, 500, TRUE),
    ('developer', 'Developer', '{"projects": {"create": true, "read": true, "update": true}, "agents": {"read": true}}'::jsonb, 100, TRUE),
    ('user', 'Standard User', '{"projects": {"create": true, "read": true, "update": false}, "agents": {"read": true}}'::jsonb, 10, TRUE),
    ('guest', 'Guest User', '{"projects": {"read": true}}'::jsonb, 1, TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- User Role Assignments Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,

    -- Assignment tracking
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(user_id, role_id)
);

-- Indexes for user_role_assignments table
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON user_role_assignments(user_id, role_id) WHERE is_active = TRUE;

-- =====================================================
-- API Keys Table
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification

    -- Permissions & Restrictions
    permissions JSONB DEFAULT '{}'::jsonb,
    ip_whitelist INET[],
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour

    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id)
);

-- Indexes for api_keys table
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE is_active = TRUE;

-- =====================================================
-- OAuth Connections Table
-- =====================================================
CREATE TABLE IF NOT EXISTS oauth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    provider VARCHAR(50) NOT NULL, -- 'github', 'google', 'microsoft', etc.
    provider_user_id VARCHAR(255) NOT NULL,

    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Provider profile data
    provider_username VARCHAR(255),
    provider_email VARCHAR(255),
    provider_avatar TEXT,
    profile_data JSONB DEFAULT '{}'::jsonb,

    -- Scopes granted
    scopes TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(provider, provider_user_id)
);

-- Indexes for oauth_connections table
CREATE INDEX idx_oauth_connections_user_id ON oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(provider, provider_user_id);
CREATE INDEX idx_oauth_connections_active ON oauth_connections(user_id, provider) WHERE is_active = TRUE;

-- =====================================================
-- User Preferences Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    category VARCHAR(100) NOT NULL, -- 'notifications', 'ui', 'privacy', etc.
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, category, key)
);

-- Indexes for user_preferences table
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(user_id, category);
CREATE INDEX idx_user_preferences_key ON user_preferences(user_id, category, key);

-- =====================================================
-- Notification Preferences Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification channels
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,

    -- Notification types
    project_updates BOOLEAN DEFAULT TRUE,
    agent_notifications BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,

    -- Frequency
    digest_frequency VARCHAR(50) DEFAULT 'daily', -- 'realtime', 'daily', 'weekly', 'never'

    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id)
);

-- Index for notification_preferences table
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON oauth_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for easier querying
-- =====================================================

-- Active users with their roles
CREATE OR REPLACE VIEW v_users_with_roles AS
SELECT
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.status,
    ARRAY_AGG(ur.name) FILTER (WHERE ur.name IS NOT NULL) as roles,
    MAX(ur.priority) as max_role_priority,
    u.created_at,
    u.last_login_at
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = TRUE
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.username, u.full_name, u.status, u.created_at, u.last_login_at;

-- Active sessions summary
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
    us.id as session_id,
    us.user_id,
    u.username,
    u.email,
    us.device_type,
    us.ip_address,
    us.country,
    us.city,
    us.created_at as session_started,
    us.last_activity_at,
    us.expires_at
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.is_active = TRUE
  AND us.expires_at > CURRENT_TIMESTAMP
  AND u.deleted_at IS NULL;

COMMIT;

-- =====================================================
-- Migration Notes:
-- =====================================================
-- 1. All passwords must be hashed using bcrypt before insertion
-- 2. Email verification is required for full account access
-- 3. Two-factor authentication is optional but recommended
-- 4. Sessions expire after inactivity (configurable)
-- 5. API keys can have custom rate limits and IP restrictions
-- 6. OAuth connections allow social login integration
-- 7. User preferences are stored in a flexible JSONB format
-- 8. Soft deletes are used for users (deleted_at field)
