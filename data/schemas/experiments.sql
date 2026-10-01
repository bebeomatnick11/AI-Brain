CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    description TEXT DEFAULT '',

    owner_id TEXT,

    workspace_id TEXT NOT NULL,

    base_version TEXT,

    status TEXT NOT NULL DEFAULT 'DRAFT',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_history (
    id TEXT PRIMARY KEY,

    experiment_id TEXT NOT NULL,

    workspace_id TEXT,

    type TEXT NOT NULL,

    status TEXT,

    actor_id TEXT,

    payload JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS
idx_experiment_history_experiment
ON experiment_history(experiment_id);

CREATE INDEX IF NOT EXISTS
idx_experiment_history_type
ON experiment_history(type);

CREATE TABLE IF NOT EXISTS experiment_archives (
    id TEXT PRIMARY KEY,

    original_change_id TEXT,

    experiment_id TEXT,

    reason TEXT,

    payload JSONB NOT NULL DEFAULT '{}',

    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS
idx_experiment_archives_experiment
ON experiment_archives(experiment_id);
