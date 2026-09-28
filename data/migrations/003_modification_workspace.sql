CREATE TABLE IF NOT EXISTS change_workspaces (
    id TEXT PRIMARY KEY,

    brain_id TEXT NOT NULL,

    proposal_id TEXT,

    purpose TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'ACTIVE',

    files JSONB NOT NULL DEFAULT '{}'::jsonb,

    original_files JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_by TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS
idx_change_workspaces_brain
ON change_workspaces(
    brain_id,
    created_at DESC
);


CREATE TABLE IF NOT EXISTS code_snapshots (
    id TEXT PRIMARY KEY,

    brain_id TEXT NOT NULL,

    workspace_id TEXT,

    parent_version TEXT,

    files JSONB NOT NULL DEFAULT '{}'::jsonb,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS
idx_code_snapshots_workspace
ON code_snapshots(
    workspace_id,
    created_at DESC
);
