CREATE TABLE IF NOT EXISTS security_audit_logs (
    id TEXT PRIMARY KEY,

    actor_id TEXT,

    role TEXT,

    action TEXT NOT NULL,

    risk TEXT,

    allowed BOOLEAN,

    reasons JSONB NOT NULL DEFAULT '[]',

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS
idx_security_audit_actor
ON security_audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS
idx_security_audit_action
ON security_audit_logs(action);

CREATE INDEX IF NOT EXISTS
idx_security_audit_risk
ON security_audit_logs(risk);

CREATE INDEX IF NOT EXISTS
idx_security_audit_created
ON security_audit_logs(created_at);
