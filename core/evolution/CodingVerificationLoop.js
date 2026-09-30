"use strict";

class CodingVerificationLoop {

    constructor(options = {}) {

        this.verifier =
            options.verifier;

        this.diagnoser =
            options.diagnoser;

        this.repairEngine =
            options.repairEngine;

        this.audit =
            options.audit ||
            null;

        this.maxCycles =
            Math.min(
                Number(
                    options.maxCycles ||
                    3
                ),
                5
            );
    }

    async run(
        workspace,
        requirements = {},
        repairer,
        actor = {}
    ) {

        const history = [];

        for (
            let cycle = 1;
            cycle <= this.maxCycles;
            cycle++
        ) {

            const verification =
                await this.verifier.verify(
                    workspace,
                    requirements,
                    actor
                );

            history.push({
                cycle,
                verification
            });

            if (
                verification.status ===
                "PASSED"
            ) {

                await this.audit?.record(
                    "coding.loop.completed",
                    {
                        workspaceId:
                            workspace.id,

                        cycle,

                        status:
                            "PASSED"
                    },
                    actor
                );

                return {

                    status:
                        "PASSED",

                    cycles:
                        cycle,

                    history
                };
            }

            /*
             * Tìm failure evidence
             */

            const failure =
                extractFailure(
                    verification
                );

            /*
             * Không còn repairer
             */

            if (
                typeof repairer !==
                "function"
            ) {

                return {

                    status:
                        "ESCALATE",

                    cycles:
                        cycle,

                    history
                };
            }

            const repair =
                await this.repairEngine
                    .repair(
                        workspace,
                        failure,
                        repairer,
                        actor
                    );

            history.push({
                cycle,
                repair
            });

            if (
                repair.status !==
                "PATCHED"
            ) {

                return {

                    status:
                        "ESCALATE",

                    cycles:
                        cycle,

                    history
                };
            }
        }

        return {

            status:
                "REPAIR_LIMIT_REACHED",

            cycles:
                this.maxCycles,

            history
        };
    }
}

function extractFailure(
    verification
) {

    for (
        const attempt of
        verification.attempts || []
    ) {

        for (
            const check of
            attempt.checks || []
        ) {

            if (
                !check.passed
            ) {

                return check;
            }
        }
    }

    return {
        message:
            "Verification failed."
    };
}

module.exports = {
    CodingVerificationLoop
};
