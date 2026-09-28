"use strict";

const crypto = require("crypto");

class ChangeWorkspace {

    constructor(options = {}) {

        this.db =
            options.db || null;

        this.audit =
            options.audit || null;

        this.workspaces =
            new Map();
    }

    async create(
        input = {},
        actor = {}
    ) {

        const id =
            crypto.randomUUID();

        const workspace = {

            id,

            brainId:
                input.brainId ||
                "global",

            proposalId:
                input.proposalId ||
                null,

            purpose:
                input.purpose ||
                "controlled change",

            status:
                "ACTIVE",

            files:
                cloneFiles(
                    input.files || {}
                ),

            originalFiles:
                cloneFiles(
                    input.files || {}
                ),

            changes: [],

            verificationRuns: [],

            createdBy:
                actor.id || null,

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()
        };

        this.workspaces.set(
            id,
            workspace
        );

        if (this.db?.query) {

            await this.db.query(
                `
                INSERT INTO change_workspaces
                (
                    id,
                    brain_id,
                    proposal_id,
                    purpose,
                    status,
                    files,
                    original_files,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,NOW(),NOW()
                )
                `,
                [
                    workspace.id,
                    workspace.brainId,
                    workspace.proposalId,
                    workspace.purpose,
                    workspace.status,
                    JSON.stringify(
                        workspace.files
                    ),
                    JSON.stringify(
                        workspace.originalFiles
                    ),
                    workspace.createdBy
                ]
            );
        }

        await this.audit?.record(
            "workspace.created",
            {
                workspaceId: id,
                proposalId:
                    workspace.proposalId
            },
            actor
        );

        return workspace;
    }

    get(id) {

        return this.workspaces.get(
            id
        ) || null;
    }

    async writeFile(
        workspaceId,
        path,
        content,
        actor = {}
    ) {

        const workspace =
            this.get(
                workspaceId
            );

        if (!workspace) {

            throw new Error(
                "WORKSPACE_NOT_FOUND"
            );
        }

        if (
            workspace.status !==
            "ACTIVE"
        ) {

            throw new Error(
                "WORKSPACE_NOT_ACTIVE"
            );
        }

        if (
            typeof path !== "string" ||
            !path.trim()
        ) {

            throw new Error(
                "INVALID_FILE_PATH"
            );
        }

        if (
            typeof content !==
            "string"
        ) {

            throw new Error(
                "INVALID_FILE_CONTENT"
            );
        }

        /*
         * Không cho workspace ghi
         * vào các vùng nguy hiểm.
         */

        if (
            isProtectedPath(path)
        ) {

            throw new Error(
                "PROTECTED_PATH"
            );
        }

        workspace.files[path] =
            content;

        workspace.changes.push({
            type: "WRITE",
            path,
            actorId:
                actor.id || null,
            timestamp:
                new Date().toISOString()
        });

        workspace.updatedAt =
            new Date().toISOString();

        return workspace;
    }

    async deleteFile(
        workspaceId,
        path,
        actor = {}
    ) {

        const workspace =
            this.get(
                workspaceId
            );

        if (!workspace) {

            throw new Error(
                "WORKSPACE_NOT_FOUND"
            );
        }

        if (
            isProtectedPath(path)
        ) {

            throw new Error(
                "PROTECTED_PATH"
            );
        }

        delete workspace.files[
            path
        ];

        workspace.changes.push({
            type: "DELETE",
            path,
            actorId:
                actor.id || null,
            timestamp:
                new Date().toISOString()
        });

        return workspace;
    }

    close(
        workspaceId,
        status = "CLOSED"
    ) {

        const workspace =
            this.get(
                workspaceId
            );

        if (!workspace) {

            throw new Error(
                "WORKSPACE_NOT_FOUND"
            );
        }

        workspace.status =
            status;

        workspace.updatedAt =
            new Date().toISOString();

        return workspace;
    }
}

function cloneFiles(files) {

    return {
        ...files
    };
}

function isProtectedPath(path) {

    const normalized =
        path
            .replaceAll("\\", "/")
            .toLowerCase();

    const protectedPatterns = [

        ".env",

        ".git/",

        "secrets/",

        "secret-vault/",

        "credentials/",

        "auth/",

        "security/",

        "production/",

        "node_modules/"
    ];

    return protectedPatterns.some(
        pattern =>
            normalized.includes(
                pattern
            )
    );
}

module.exports = {
    ChangeWorkspace
};
