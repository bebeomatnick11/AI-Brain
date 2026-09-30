"use strict";

class CodeRepairEngine {

    constructor(options = {}) {

        this.workspace =
            options.workspace;

        this.diagnoser =
            options.diagnoser;

        this.audit =
            options.audit ||
            null;

        this.maxRepairs =
            Math.min(
                Number(
                    options.maxRepairs ||
                    3
                ),
                5
            );
    }

    async repair(
        workspace,
        failure,
        repairer,
        actor = {}
    ) {

        if (!workspace) {

            throw new Error(
                "WORKSPACE_REQUIRED"
            );
        }

        const diagnosis =
            this.diagnoser.diagnose(
                failure,
                {
                    workspaceId:
                        workspace.id
                }
            );

        if (
            !diagnosis.repairable
        ) {

            return {

                status:
                    "ESCALATE",

                diagnosis
            };
        }

        if (
            typeof repairer !==
            "function"
        ) {

            return {

                status:
                    "REPAIR_ENGINE_UNAVAILABLE",

                diagnosis
            };
        }

        const attempts = [];

        for (
            let i = 1;
            i <= this.maxRepairs;
            i++
        ) {

            try {

                const result =
                    await repairer({
                        workspace,
                        diagnosis,
                        failure,
                        attempt:
                            i
                    });

                attempts.push({
                    attempt: i,
                    result
                });

                if (
                    result?.changed
                ) {

                    await this.audit?.record(
                        "code.repair.applied",
                        {
                            workspaceId:
                                workspace.id,

                            attempt: i,

                            diagnosis:
                                diagnosis.category
                        },
                        actor
                    );

                    return {

                        status:
                            "PATCHED",

                        diagnosis,

                        attempts
                    };
                }

            } catch (error) {

                attempts.push({
                    attempt: i,

                    error:
                        error.message
                });
            }
        }

        return {

            status:
                "REPAIR_EXHAUSTED",

            diagnosis,

            attempts
        };
    }
}

module.exports = {
    CodeRepairEngine
};
