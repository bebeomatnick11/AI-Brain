"use strict";

class CodingPipeline {

    constructor(options = {}) {

        this.agent =
            options.agent;

        this.modification =
            options.modification;

        this.verificationLoop =
            options.verificationLoop;

        this.audit =
            options.audit || null;
    }

    async run(
        input = {},
        actor = {}
    ) {

        const workspace =
            input.workspace;

        if (!workspace) {

            throw new Error(
                "WORKSPACE_REQUIRED"
            );
        }

        const repair =
            await this.agent.repair(
                input,
                actor
            );

        if (
            repair.status !==
            "PATCH_GENERATED"
        ) {

            return repair;
        }

        /*
         * Apply patch vào workspace.
         *
         * Production chưa bị đụng.
         */

        const patch =
            repair.patch;

        await this.applyPatch(
            workspace,
            patch,
            actor
        );

        /*
         * Verify lại toàn bộ.
         */

        const verification =
            await this.verificationLoop.run(
                workspace,
                input.requirements ||
                {},
                async repairRequest => {

                    const next =
                        await this.agent.repair(
                            {
                                ...input,

                                workspace,

                                error:
                                    repairRequest.failure,

                                task:
                                    "Repair verification failure"
                            },
                            actor
                        );

                    if (
                        next.status !==
                        "PATCH_GENERATED"
                    ) {

                        return {
                            changed: false,
                            result: next
                        };
                    }

                    await this.applyPatch(
                        workspace,
                        next.patch,
                        actor
                    );

                    return {
                        changed: true,
                        result: next
                    };
                },
                actor
            );

        await this.audit?.record(
            "coding.pipeline.completed",
            {
                workspaceId:
                    workspace.id,

                status:
                    verification.status
            },
            actor
        );

        return {

            status:
                verification.status,

            repair,

            verification,

            workspaceId:
                workspace.id
        };
    }

    async applyPatch(
        workspace,
        patch,
        actor
    ) {

        if (
            !Array.isArray(patch?.files)
        ) {

            throw new Error(
                "INVALID_PATCH_FORMAT"
            );
        }

        for (
            const file of
            patch.files
        ) {

            if (
                !file.path ||
                typeof file.content !==
                "string"
            ) {

                throw new Error(
                    "INVALID_PATCH_FILE"
                );
            }

            await this.modification
                .workspace
                .writeFile(
                    workspace.id,
                    file.path,
                    file.content,
                    actor
                );
        }
    }
}

module.exports = {
    CodingPipeline
};
