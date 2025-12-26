-- Zekka Framework Database Schema
-- PostgreSQL initialization script

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    story_points INTEGER,
    budget_daily DECIMAL(10, 2),
    budget_monthly DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) UNIQUE NOT NULL,
    project_id VARCHAR(255) REFERENCES projects(project_id),
    stage INTEGER NOT NULL,
    agent_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent states table
CREATE TABLE IF NOT EXISTS agent_states (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) REFERENCES tasks(task_id),
    agent_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'idle',
    current_file VARCHAR(255),
    state_data JSONB,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File locks table
CREATE TABLE IF NOT EXISTS file_locks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(task_id, file_path)
);

-- Conflicts table
CREATE TABLE IF NOT EXISTS conflicts (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) REFERENCES tasks(task_id),
    file_path VARCHAR(255) NOT NULL,
    agent_a VARCHAR(255) NOT NULL,
    agent_b VARCHAR(255) NOT NULL,
    conflict_data JSONB,
    resolution_status VARCHAR(50) DEFAULT 'pending',
    resolution_data JSONB,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Cost tracking table
CREATE TABLE IF NOT EXISTS cost_tracking (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) REFERENCES projects(project_id),
    task_id VARCHAR(255),
    agent_name VARCHAR(255),
    model_used VARCHAR(100),
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_usd DECIMAL(10, 4),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    user_or_agent VARCHAR(255),
    action VARCHAR(255),
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON tasks(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_states_task_id ON agent_states(task_id);
CREATE INDEX IF NOT EXISTS idx_file_locks_task_id ON file_locks(task_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_task_id ON conflicts(task_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_project_id ON cost_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp ON cost_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Create views for common queries
CREATE OR REPLACE VIEW project_summary AS
SELECT 
    p.project_id,
    p.name,
    p.status,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COALESCE(SUM(c.cost_usd), 0) as total_cost,
    MAX(t.updated_at) as last_activity
FROM projects p
LEFT JOIN tasks t ON p.project_id = t.project_id
LEFT JOIN cost_tracking c ON p.project_id = c.project_id
GROUP BY p.project_id, p.name, p.status;

CREATE OR REPLACE VIEW daily_costs AS
SELECT 
    DATE(timestamp) as date,
    project_id,
    SUM(cost_usd) as daily_cost,
    COUNT(*) as api_calls,
    string_agg(DISTINCT model_used, ', ') as models_used
FROM cost_tracking
GROUP BY DATE(timestamp), project_id
ORDER BY date DESC, project_id;

-- Insert sample configuration
INSERT INTO projects (project_id, name, description, story_points, budget_daily, budget_monthly)
VALUES ('demo-project', 'Demo Project', 'Sample project for testing', 8, 50.00, 1000.00)
ON CONFLICT (project_id) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zekka;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zekka;
