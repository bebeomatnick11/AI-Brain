CREATE TABLE IF NOT EXISTS error_events (
    id TEXT PRIMARY KEY,
    brain_id TEXT NOT NULL,
    agent_id TEXT,
    skill_id TEXT,
    run_id TEXT,

    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,

    redacted_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    stack_trace TEXT,

    visibility TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'OPEN',

    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS
idx_error_events_brain_created
ON error_events(
    brain_id,
    created_at DESC
);


CREATE TABLE IF NOT EXISTS change_proposals (
    id TEXT PRIMARY KEY,

    brain_id TEXT NOT NULL,

    title TEXT NOT NULL,
    reason TEXT NOT NULL,

    risk_level TEXT NOT NULL,

    status TEXT NOT NULL,

    requires_owner BOOLEAN NOT NULL DEFAULT FALSE,

    requires_extra_review BOOLEAN NOT NULL DEFAULT FALSE,

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_by TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejected_by TEXT,
    rejected_at TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS experiment_workspaces (
    id TEXT PRIMARY KEY,

    brain_id TEXT NOT NULL,

    name TEXT NOT NULL,

    owner_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'DRAFT',

    policy JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS experiment_runs (
    id TEXT PRIMARY KEY,

    experiment_id TEXT NOT NULL,

    skill_id TEXT,

    status TEXT NOT NULL,

    input JSONB NOT NULL DEFAULT '{}'::jsonb,

    output JSONB,

    error_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    finished_at TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,

    event_type TEXT NOT NULL,

    actor_id TEXT,

    actor_role TEXT,

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS
idx_audit_logs_created
ON audit_logs(created_at DESC);
