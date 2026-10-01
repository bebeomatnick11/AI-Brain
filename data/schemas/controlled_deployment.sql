CREATE TABLE IF NOT EXISTS change_sets (
    id TEXT PRIMARY KEY,

    experiment_id TEXT,

    workspace_id TEXT,

    title TEXT NOT NULL,

    description TEXT DEFAULT '',

    reason TEXT DEFAULT '',

    author_id TEXT,

    agent_id TEXT,

    risk TEXT NOT NULL DEFAULT 'LOW',

    status TEXT NOT NULL DEFAULT 'DRAFT',

    files JSONB NOT NULL DEFAULT '[]',

    dependencies JSONB NOT NULL DEFAULT '[]',

    tests JSONB NOT NULL DEFAULT '[]',

    approval JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_versions (
    id TEXT PRIMARY KEY,

    version_number INTEGER NOT NULL,

    parent_version TEXT,

    change_set_id TEXT,

    snapshot_id TEXT,

    author_id TEXT,

    agent_id TEXT,

    reason TEXT DEFAULT '',

    status TEXT NOT NULL DEFAULT 'DRAFT',

    tests JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS code_snapshots (
    id TEXT PRIMARY KEY,

    version_id TEXT,

    source TEXT,

    files JSONB NOT NULL DEFAULT '{}',

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,

    version_id TEXT NOT NULL,

    snapshot_id TEXT,

    stage TEXT NOT NULL DEFAULT 'DRAFT',

    status TEXT NOT NULL DEFAULT 'READY',

    canary_id TEXT,

    deployed_by TEXT,

    deployed_at TIMESTAMPTZ,

    rollback_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS
idx_brain_versions_status
ON brain_versions(status);

CREATE INDEX IF NOT EXISTS
idx_deployments_stage
ON deployments(stage);
