-- ===================================================================
-- Zekka Framework - Session 2 Security Enhancements
-- Database Schema for Enhanced Security Features
-- ===================================================================
-- 
-- Features Implemented:
-- 1. Enhanced audit logging with retention policies
-- 2. Encryption key rotation tracking
-- 3. Multi-factor authentication (MFA)
-- 4. Advanced password policies (history, expiration)
-- 5. Security monitoring and alerts
--
-- Standards Compliance:
-- - OWASP Top 10
-- - SOC 2 Type II
-- - GDPR Article 32 (Security of processing)
-- - PCI DSS v3.2.1
-- ===================================================================

-- ===================================================================
-- 1. ENHANCED AUDIT LOGGING
-- ===================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- User Information
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255),
    
    -- Request Information
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    method VARCHAR(10),
    endpoint VARCHAR(500),
    
    -- Security Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    api_key_id INTEGER,
    
    -- Request/Response Data
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    
    -- Outcome
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Performance Metrics
    duration_ms INTEGER,
    
    -- Security Flags
    is_suspicious BOOLEAN DEFAULT false,
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    
    -- Geo Location
    country_code CHAR(2),
    city VARCHAR(100),
    
    -- Retention
    retention_days INTEGER DEFAULT 90,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_suspicious ON audit_logs(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX idx_audit_logs_retention ON audit_logs(timestamp, archived) WHERE archived = false;

-- Partition by month for better performance
-- (For production, consider using pg_partman or manual partitioning)

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities with retention policies';

-- ===================================================================
-- 2. ENCRYPTION KEY ROTATION
-- ===================================================================

CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(100) UNIQUE NOT NULL,
    key_type VARCHAR(50) NOT NULL, -- jwt, session, data, api
    
    -- Key Material (encrypted at rest)
    key_value TEXT NOT NULL, -- Encrypted key value
    key_hash VARCHAR(255) NOT NULL, -- SHA-256 hash for verification
    
    -- Metadata
    algorithm VARCHAR(50) NOT NULL, -- HS256, RS256, AES-256-GCM, etc.
    key_size INTEGER, -- Key size in bits
    
    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    rotated_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- pending, active, rotating, retired, compromised
    is_primary BOOLEAN DEFAULT false,
    
    -- Security
    created_by INTEGER REFERENCES users(id),
    rotation_reason VARCHAR(255),
    rotation_policy VARCHAR(50) DEFAULT '90_days', -- 30_days, 90_days, 180_days, manual
    
    -- Usage Tracking
    usage_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Compliance
    compliance_tags TEXT[], -- pci_dss, gdpr, sox, hipaa
    
    CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'rotating', 'retired', 'compromised')),
    CONSTRAINT check_rotation_policy CHECK (rotation_policy IN ('30_days', '90_days', '180_days', 'manual', 'on_demand'))
);

-- Ensure only one primary key per type
CREATE UNIQUE INDEX idx_encryption_keys_primary ON encryption_keys(key_type, is_primary) WHERE is_primary = true;

-- Indexes
CREATE INDEX idx_encryption_keys_status ON encryption_keys(status);
CREATE INDEX idx_encryption_keys_expires ON encryption_keys(expires_at) WHERE status = 'active';

COMMENT ON TABLE encryption_keys IS 'Encryption key management with automatic rotation policies';

-- ===================================================================
-- 3. MULTI-FACTOR AUTHENTICATION (MFA)
-- ===================================================================

CREATE TABLE IF NOT EXISTS mfa_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device Information
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- totp, sms, email, hardware_token, backup_codes
    
    -- TOTP Configuration
    secret TEXT, -- Base32 encoded secret for TOTP
    algorithm VARCHAR(20) DEFAULT 'SHA1', -- SHA1, SHA256, SHA512
    digits INTEGER DEFAULT 6, -- 6 or 8 digit codes
    period INTEGER DEFAULT 30, -- Time step in seconds
    
    -- SMS/Email Configuration
    phone_number VARCHAR(20),
    email VARCHAR(255),
    
    -- Backup Codes
    backup_codes JSONB, -- Array of hashed backup codes
    
    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Security
    usage_count INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT check_device_type CHECK (device_type IN ('totp', 'sms', 'email', 'hardware_token', 'backup_codes'))
);

-- Indexes
CREATE INDEX idx_mfa_devices_user ON mfa_devices(user_id);
CREATE INDEX idx_mfa_devices_primary ON mfa_devices(user_id, is_primary) WHERE is_primary = true;

-- MFA Authentication Logs
CREATE TABLE IF NOT EXISTS mfa_auth_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES mfa_devices(id) ON DELETE SET NULL,
    
    -- Attempt Information
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    code_entered VARCHAR(20),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Failure Details
    failure_reason VARCHAR(100),
    
    CONSTRAINT check_failure_reason CHECK (
        failure_reason IS NULL OR 
        failure_reason IN ('invalid_code', 'expired_code', 'device_locked', 'device_disabled', 'too_many_attempts')
    )
);

CREATE INDEX idx_mfa_auth_logs_user ON mfa_auth_logs(user_id, attempted_at DESC);
CREATE INDEX idx_mfa_auth_logs_failed ON mfa_auth_logs(user_id, success) WHERE success = false;

COMMENT ON TABLE mfa_devices IS 'Multi-factor authentication devices and configuration';
COMMENT ON TABLE mfa_auth_logs IS 'MFA authentication attempts for security monitoring';

-- ===================================================================
-- 4. ADVANCED PASSWORD POLICIES
-- ===================================================================

-- Extend users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip INET;

-- Password History
CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by INTEGER REFERENCES users(id), -- For admin password resets
    change_reason VARCHAR(50), -- user_request, admin_reset, expired, compromised, policy
    ip_address INET,
    
    CONSTRAINT check_change_reason CHECK (
        change_reason IN ('user_request', 'admin_reset', 'expired', 'compromised', 'policy', 'initial')
    )
);

CREATE INDEX idx_password_history_user ON password_history(user_id, changed_at DESC);

-- Password Policy Configuration
CREATE TABLE IF NOT EXISTS password_policies (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(100) UNIQUE NOT NULL,
    
    -- Complexity Requirements
    min_length INTEGER DEFAULT 12,
    max_length INTEGER DEFAULT 128,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_special_chars BOOLEAN DEFAULT true,
    special_chars VARCHAR(100) DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',
    
    -- History
    password_history_count INTEGER DEFAULT 5, -- Prevent reuse of last N passwords
    
    -- Expiration
    password_expiry_days INTEGER DEFAULT 90,
    password_expiry_warning_days INTEGER DEFAULT 14,
    
    -- Lockout Policy
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    
    -- Common Password Check
    check_common_passwords BOOLEAN DEFAULT true,
    check_breached_passwords BOOLEAN DEFAULT true, -- Check against haveibeenpwned
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Insert default policy
INSERT INTO password_policies (policy_name) VALUES ('default')
ON CONFLICT (policy_name) DO NOTHING;

COMMENT ON TABLE password_history IS 'Password change history for enforcing non-reuse policies';
COMMENT ON TABLE password_policies IS 'Configurable password policy rules for enhanced security';

-- ===================================================================
-- 5. SECURITY MONITORING & ALERTS
-- ===================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Event Classification
    event_type VARCHAR(100) NOT NULL, -- login_failed, suspicious_activity, rate_limit_exceeded, etc.
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    category VARCHAR(50) NOT NULL, -- authentication, authorization, data_access, api_abuse, security_violation
    
    -- Affected Entity
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    
    -- Event Details
    description TEXT NOT NULL,
    details JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(500),
    method VARCHAR(10),
    
    -- Response
    auto_action_taken VARCHAR(100), -- account_locked, ip_blocked, rate_limited, mfa_required, session_terminated
    requires_manual_review BOOLEAN DEFAULT false,
    reviewed BOOLEAN DEFAULT false,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution TEXT,
    
    -- Correlation
    correlation_id UUID, -- Group related events
    related_events INTEGER[], -- Array of related event IDs
    
    CONSTRAINT check_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT check_category CHECK (category IN ('authentication', 'authorization', 'data_access', 'api_abuse', 'security_violation', 'compliance'))
);

-- Indexes
CREATE INDEX idx_security_events_occurred ON security_events(occurred_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_unreviewed ON security_events(requires_manual_review, reviewed) WHERE requires_manual_review = true AND reviewed = false;

-- Alert Rules Configuration
CREATE TABLE IF NOT EXISTS security_alert_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Conditions
    event_types TEXT[], -- Array of event types to match
    severity_threshold VARCHAR(20), -- Minimum severity to trigger
    time_window_minutes INTEGER, -- Time window for counting occurrences
    occurrence_threshold INTEGER, -- Number of occurrences to trigger
    
    -- Actions
    actions JSONB, -- {email: [], slack: [], pagerduty: [], auto_block: true}
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Alert History
CREATE TABLE IF NOT EXISTS security_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    rule_id INTEGER REFERENCES security_alert_rules(id),
    
    -- Alert Information
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Affected Entities
    affected_users INTEGER[],
    affected_ips INET[],
    
    -- Related Events
    event_ids BIGINT[],
    event_count INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'open', -- open, investigating, resolved, false_positive
    assigned_to INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution TEXT,
    
    -- Actions Taken
    actions_taken JSONB,
    
    CONSTRAINT check_alert_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT check_alert_status CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive'))
);

CREATE INDEX idx_security_alerts_triggered ON security_alerts(triggered_at DESC);
CREATE INDEX idx_security_alerts_status ON security_alerts(status) WHERE status IN ('open', 'investigating');
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity) WHERE severity IN ('high', 'critical');

COMMENT ON TABLE security_events IS 'Security events and incidents for monitoring and alerting';
COMMENT ON TABLE security_alert_rules IS 'Configurable rules for security alert triggering';
COMMENT ON TABLE security_alerts IS 'Security alerts generated by rules or manual creation';

-- ===================================================================
-- 6. API KEY MANAGEMENT (Enhanced)
-- ===================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Key Information
    key_id VARCHAR(50) UNIQUE NOT NULL, -- Public identifier (e.g., "zk_live_abc123...")
    key_hash TEXT NOT NULL, -- SHA-256 hash of the actual key
    key_prefix VARCHAR(20), -- First few characters for display (e.g., "zk_live_abc...")
    
    -- Metadata
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permissions
    scopes TEXT[], -- Array of permission scopes
    rate_limit_per_minute INTEGER DEFAULT 100,
    
    -- Lifecycle
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Usage Tracking
    usage_count BIGINT DEFAULT 0,
    
    -- Security
    allowed_ips INET[], -- IP whitelist
    require_mfa BOOLEAN DEFAULT false
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_id ON api_keys(key_id) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL AND is_active = true;

COMMENT ON TABLE api_keys IS 'API key management with enhanced security features';

-- ===================================================================
-- 7. SESSION MANAGEMENT (Enhanced)
-- ===================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Data
    data JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Security
    mfa_verified BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0, -- 0-100 risk score
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(100)
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;

COMMENT ON TABLE user_sessions IS 'Enhanced session management with security context';

-- ===================================================================
-- 8. COMPLIANCE & DATA RETENTION
-- ===================================================================

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    WITH archived AS (
        UPDATE audit_logs
        SET archived = true, archived_at = CURRENT_TIMESTAMP
        WHERE archived = false
          AND timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM archived;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to delete archived audit logs older than 1 year
CREATE OR REPLACE FUNCTION delete_archived_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM audit_logs
        WHERE archived = true
          AND archived_at < CURRENT_TIMESTAMP - INTERVAL '1 year'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule these functions with pg_cron or application-level cron jobs

COMMENT ON FUNCTION archive_old_audit_logs() IS 'Archives audit logs based on retention policies';
COMMENT ON FUNCTION delete_archived_audit_logs() IS 'Deletes archived logs older than 1 year';

-- ===================================================================
-- 9. VIEWS FOR SECURITY MONITORING
-- ===================================================================

-- Active Security Threats View
CREATE OR REPLACE VIEW v_active_security_threats AS
SELECT 
    se.id,
    se.event_id,
    se.occurred_at,
    se.event_type,
    se.severity,
    se.user_id,
    u.email as user_email,
    se.ip_address,
    se.description,
    se.auto_action_taken,
    se.requires_manual_review,
    se.reviewed
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
WHERE se.severity IN ('high', 'critical')
  AND se.occurred_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY se.occurred_at DESC;

-- Failed Login Attempts View
CREATE OR REPLACE VIEW v_failed_login_attempts AS
SELECT 
    user_id,
    COUNT(*) as attempt_count,
    MAX(attempted_at) as last_attempt,
    ARRAY_AGG(DISTINCT ip_address) as ip_addresses
FROM mfa_auth_logs
WHERE success = false
  AND attempted_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 3
ORDER BY attempt_count DESC;

-- Expiring Passwords View
CREATE OR REPLACE VIEW v_expiring_passwords AS
SELECT 
    u.id,
    u.email,
    u.password_expires_at,
    (u.password_expires_at - CURRENT_TIMESTAMP) as time_until_expiry
FROM users u
WHERE u.password_expires_at IS NOT NULL
  AND u.password_expires_at > CURRENT_TIMESTAMP
  AND u.password_expires_at < CURRENT_TIMESTAMP + INTERVAL '14 days'
ORDER BY u.password_expires_at ASC;

-- ===================================================================
-- 10. GRANTS (Production: Use specific roles)
-- ===================================================================

-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO zekka_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO zekka_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO zekka_app;

-- ===================================================================
-- SCHEMA VERIFICATION
-- ===================================================================

-- Verify all tables were created
DO $$
DECLARE
    missing_tables TEXT[];
BEGIN
    SELECT ARRAY_AGG(table_name)
    INTO missing_tables
    FROM (
        VALUES 
            ('audit_logs'),
            ('encryption_keys'),
            ('mfa_devices'),
            ('mfa_auth_logs'),
            ('password_history'),
            ('password_policies'),
            ('security_events'),
            ('security_alert_rules'),
            ('security_alerts'),
            ('api_keys'),
            ('user_sessions')
    ) AS expected(table_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = expected.table_name
    );
    
    IF missing_tables IS NOT NULL THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All security tables created successfully!';
    END IF;
END $$;
