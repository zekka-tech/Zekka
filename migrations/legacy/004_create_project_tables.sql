-- =====================================================
-- Migration: 004 - Project and Conversation Tables
-- =====================================================
-- Description: Create project management and conversation tracking tables
-- Author: Zekka Framework Team
-- Date: 2024-01-22
-- Dependencies: 003_create_user_tables.sql
-- =====================================================

BEGIN;

-- =====================================================
-- Projects Table
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Project Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100) DEFAULT 'web-application', -- 'web-application', 'api', 'mobile-app', 'desktop-app', etc.

    -- Repository Information
    repository_url TEXT,
    repository_provider VARCHAR(50), -- 'github', 'gitlab', 'bitbucket'
    repository_branch VARCHAR(255) DEFAULT 'main',
    repository_path TEXT,

    -- Project Configuration
    config JSONB DEFAULT '{}'::jsonb,
    environment_variables JSONB DEFAULT '{}'::jsonb, -- Encrypted in application layer

    -- Framework & Stack
    framework VARCHAR(100), -- 'react', 'vue', 'angular', 'express', etc.
    language VARCHAR(50), -- 'javascript', 'typescript', 'python', etc.
    tech_stack TEXT[],

    -- Status & Progress
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN (
        'planning', 'in-progress', 'paused', 'completed', 'failed', 'archived'
    )),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_stage VARCHAR(100), -- 'Stage 1: Planning', 'Stage 2: Development', etc.

    -- Budget & Resources
    budget_allocated DECIMAL(10, 2),
    budget_used DECIMAL(10, 2) DEFAULT 0,
    budget_currency VARCHAR(10) DEFAULT 'USD',

    -- Timeline
    start_date TIMESTAMP WITH TIME ZONE,
    target_completion_date TIMESTAMP WITH TIME ZONE,
    actual_completion_date TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,

    -- Quality Metrics
    test_coverage DECIMAL(5, 2), -- Percentage
    code_quality_score DECIMAL(5, 2), -- 0-10 scale
    security_score DECIMAL(5, 2), -- 0-10 scale
    performance_score DECIMAL(5, 2), -- 0-100 scale

    -- Settings
    settings JSONB DEFAULT '{
        "auto_deploy": false,
        "code_review_required": true,
        "ci_cd_enabled": true,
        "notifications_enabled": true
    }'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for projects table
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status) WHERE archived_at IS NULL;
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_name_search ON projects USING GIN(to_tsvector('english', name));
CREATE INDEX idx_projects_metadata ON projects USING GIN(metadata);
CREATE INDEX idx_projects_tech_stack ON projects USING GIN(tech_stack);

-- =====================================================
-- Project Members Table
-- =====================================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role in project
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'developer', 'viewer', 'member')),

    -- Permissions
    permissions JSONB DEFAULT '{
        "read": true,
        "write": false,
        "delete": false,
        "manage": false
    }'::jsonb,

    -- Membership tracking
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP WITH TIME ZONE,

    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(project_id, user_id)
);

-- Indexes for project_members table
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_active ON project_members(project_id, user_id) WHERE is_active = TRUE;

-- =====================================================
-- Conversations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Conversation Information
    title VARCHAR(500),
    type VARCHAR(50) DEFAULT 'chat' CHECK (type IN ('chat', 'task', 'review', 'support')),

    -- Context
    context JSONB DEFAULT '{}'::jsonb,
    tags TEXT[],

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    is_pinned BOOLEAN DEFAULT FALSE,

    -- Message statistics
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,

    -- Model used
    model VARCHAR(100), -- 'claude-sonnet-4-5', 'gemini-pro', etc.
    model_version VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for conversations table
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_tags ON conversations USING GIN(tags);

-- =====================================================
-- Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Message Content
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK (content_type IN ('text', 'code', 'markdown', 'html', 'json')),

    -- Model Information
    model VARCHAR(100),
    model_version VARCHAR(50),
    tokens_used INTEGER,
    cost DECIMAL(10, 6), -- Cost in USD

    -- Tool/Function Calls
    tool_calls JSONB,
    tool_results JSONB,

    -- Citations & Sources
    citations JSONB, -- Array of sources
    sources JSONB, -- Array of source documents

    -- Message Metadata
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    parent_message_id UUID REFERENCES messages(id),

    -- Status
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'error', 'deleted')),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for messages table
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_parent_message ON messages(parent_message_id);
CREATE INDEX idx_messages_content_search ON messages USING GIN(to_tsvector('english', content));

-- =====================================================
-- Message Reactions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    reaction VARCHAR(50) NOT NULL, -- 'like', 'helpful', 'unhelpful', 'bookmark'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(message_id, user_id, reaction)
);

-- Indexes for message_reactions table
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- =====================================================
-- Project Files Table
-- =====================================================
CREATE TABLE IF NOT EXISTS project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- File Information
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL, -- Size in bytes
    mime_type VARCHAR(255),
    file_extension VARCHAR(50),

    -- File Hash for deduplication
    file_hash VARCHAR(64), -- SHA-256 hash
    checksum VARCHAR(64),

    -- Storage Information
    storage_provider VARCHAR(50) DEFAULT 'local', -- 'local', 's3', 'azure', 'gcs'
    storage_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,

    -- Processing Status
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    processed_at TIMESTAMP WITH TIME ZONE,

    -- Usage tracking
    download_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for project_files table
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_uploaded_by ON project_files(uploaded_by);
CREATE INDEX idx_project_files_file_hash ON project_files(file_hash);
CREATE INDEX idx_project_files_created_at ON project_files(created_at DESC);
CREATE INDEX idx_project_files_filename_search ON project_files USING GIN(to_tsvector('english', filename));

-- =====================================================
-- Project Activity Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS project_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Activity Information
    action VARCHAR(100) NOT NULL, -- 'project_created', 'member_added', 'file_uploaded', etc.
    entity_type VARCHAR(100), -- 'project', 'conversation', 'file', 'member'
    entity_id UUID,

    -- Changes
    changes JSONB, -- Before/after values
    description TEXT,

    -- Context
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for project_activity_logs table
CREATE INDEX idx_activity_logs_project_id ON project_activity_logs(project_id);
CREATE INDEX idx_activity_logs_user_id ON project_activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON project_activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON project_activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON project_activity_logs(entity_type, entity_id);

-- =====================================================
-- Project Tags Table
-- =====================================================
CREATE TABLE IF NOT EXISTS project_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    tag VARCHAR(100) NOT NULL,
    color VARCHAR(50) DEFAULT '#3B82F6',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, tag)
);

-- Indexes for project_tags table
CREATE INDEX idx_project_tags_project_id ON project_tags(project_id);
CREATE INDEX idx_project_tags_tag ON project_tags(tag);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_files_updated_at BEFORE UPDATE ON project_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Triggers for conversation statistics
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET
        message_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = NEW.conversation_id),
        last_message_at = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_on_message_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_stats();

-- =====================================================
-- Views for easier querying
-- =====================================================

-- Projects with member count and activity
CREATE OR REPLACE VIEW v_projects_summary AS
SELECT
    p.id,
    p.name,
    p.description,
    p.status,
    p.progress,
    p.owner_id,
    u.username as owner_username,
    COUNT(DISTINCT pm.user_id) as member_count,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT pf.id) as file_count,
    p.budget_allocated,
    p.budget_used,
    (p.budget_allocated - p.budget_used) as budget_remaining,
    p.test_coverage,
    p.code_quality_score,
    p.created_at,
    p.updated_at
FROM projects p
JOIN users u ON p.owner_id = u.id
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.is_active = TRUE
LEFT JOIN conversations c ON p.id = c.project_id AND c.status = 'active'
LEFT JOIN project_files pf ON p.id = pf.project_id AND pf.deleted_at IS NULL
WHERE p.archived_at IS NULL
GROUP BY p.id, u.username;

-- Active conversations with message count
CREATE OR REPLACE VIEW v_active_conversations AS
SELECT
    c.id,
    c.title,
    c.project_id,
    p.name as project_name,
    c.user_id,
    u.username,
    c.message_count,
    c.last_message_at,
    c.model,
    c.created_at,
    c.is_pinned
FROM conversations c
JOIN users u ON c.user_id = u.id
LEFT JOIN projects p ON c.project_id = p.id
WHERE c.status = 'active'
ORDER BY c.last_message_at DESC NULLS LAST;

-- Recent project activity
CREATE OR REPLACE VIEW v_recent_project_activity AS
SELECT
    pal.id,
    pal.project_id,
    p.name as project_name,
    pal.user_id,
    u.username,
    pal.action,
    pal.entity_type,
    pal.description,
    pal.created_at
FROM project_activity_logs pal
JOIN projects p ON pal.project_id = p.id
LEFT JOIN users u ON pal.user_id = u.id
WHERE p.archived_at IS NULL
ORDER BY pal.created_at DESC
LIMIT 100;

COMMIT;

-- =====================================================
-- Migration Notes:
-- =====================================================
-- 1. Projects support multiple members with role-based permissions
-- 2. Conversations are linked to projects and users
-- 3. Messages track token usage and costs for budget management
-- 4. File uploads support deduplication via file hashing
-- 5. Activity logs provide comprehensive audit trail
-- 6. Automatic statistics tracking for conversations
-- 7. Full-text search enabled on project names and filenames
-- 8. Budget tracking at project level with currency support
