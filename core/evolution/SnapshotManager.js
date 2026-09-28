"use strict";

const crypto = require("crypto");

class SnapshotManager {

    constructor(options = {}) {

        this.db =
            options.db || null;

        this.storage =
            options.storage || null;

        this.audit =
            options.audit || null;
    }

    async createSnapshot(input = {}, actor = {}) {

        const snapshot = {

            id:
                crypto.randomUUID(),

            brainId:
                input.brainId || "global",

            workspaceId:
                input.workspaceId || null,

            parentVersion:
                input.parentVersion || null,

            files:
                sanitizeFiles(
                    input.files || {}
                ),

            metadata: {
                reason:
                    input.reason ||
                    "pre-change snapshot",

                createdBy:
                    actor.id || null,

                createdAt:
                    new Date().toISOString()
            }
        };

        if (this.storage?.saveSnapshot) {

            await this.storage.saveSnapshot(
                snapshot
            );
        }

        if (this.db?.query) {

            await this.db.query(
                `
                INSERT INTO code_snapshots
                (
                    id,
                    brain_id,
                    workspace_id,
                    parent_version,
                    files,
                    metadata,
                    created_at
                )
                VALUES
                (
                    $1,$2,$3,$4,$5,$6,NOW()
                )
                `,
                [
                    snapshot.id,
                    snapshot.brainId,
                    snapshot.workspaceId,
                    snapshot.parentVersion,
                    JSON.stringify(snapshot.files),
                    JSON.stringify(snapshot.metadata)
                ]
            );
        }

        await this.audit?.record(
            "snapshot.created",
            {
                snapshotId:
                    snapshot.id,

                workspaceId:
                    snapshot.workspaceId,

                parentVersion:
                    snapshot.parentVersion
            },
            actor
        );

        return snapshot;
    }

    async restoreSnapshot(
        snapshot,
        actor = {}
    ) {

        if (!snapshot) {

            throw new Error(
                "SNAPSHOT_NOT_FOUND"
            );
        }

        /*
         * Snapshot restore chỉ phục hồi
         * vào workspace.
         *
         * Không ghi production.
         */

        const restored = {
            ...snapshot,
            restoredAt:
                new Date().toISOString(),

            restoredBy:
                actor.id || null
        };

        await this.audit?.record(
            "snapshot.restored",
            {
                snapshotId:
                    snapshot.id
            },
            actor
        );

        return restored;
    }
}

function sanitizeFiles(files) {

    const result = {};

    for (
        const [
            file,
            content
        ] of Object.entries(files)
    ) {

        if (
            typeof file !== "string"
        ) {
            continue;
        }

        if (
            typeof content !==
            "string"
        ) {
            continue;
        }

        result[file] =
            content;
    }

    return result;
}

module.exports = {
    SnapshotManager
};
