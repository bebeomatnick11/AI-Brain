"use strict";

class VerificationController {

    constructor(options = {}) {

        this.audit =
            options.audit || null;

        this.syntaxValidator =
            options.syntaxValidator ||
            defaultSyntaxValidator;

        this.contractValidator =
            options.contractValidator ||
            defaultContractValidator;

        this.testRunner =
            options.testRunner ||
            null;

        this.regressionRunner =
            options.regressionRunner ||
            null;

        this.maxAttempts =
            Math.max(
                1,
                Math.min(
                    Number(
                        options.maxAttempts ||
                        3
                    ),
                    5
                )
            );
    }

    async verify(
        workspace,
        requirements = {},
        actor = {}
    ) {

        if (!workspace) {

            throw new Error(
                "WORKSPACE_REQUIRED"
            );
        }

        const run = {

            workspaceId:
                workspace.id,

            status:
                "RUNNING",

            attempts: [],

            startedAt:
                new Date().toISOString()
        };

        for (
            let attempt = 1;
            attempt <=
            this.maxAttempts;
            attempt++
        ) {

            const result =
                await this.runAttempt(
                    workspace,
                    requirements,
                    attempt
                );

            run.attempts.push(
                result
            );

            if (result.passed) {

                run.status =
                    "PASSED";

                run.finishedAt =
                    new Date().toISOString();

                await this.audit?.record(
                    "verification.passed",
                    {
                        workspaceId:
                            workspace.id,

                        attempts:
                            attempt
                    },
                    actor
                );

                return run;
            }
        }

        run.status =
            "FAILED";

        run.finishedAt =
            new Date().toISOString();

        await this.audit?.record(
            "verification.failed",
            {
                workspaceId:
                    workspace.id,

                attempts:
                    run.attempts.length
            },
            actor
        );

        return run;
    }

    async runAttempt(
        workspace,
        requirements,
        attempt
    ) {

        const result = {

            attempt,

            passed: true,

            checks: [],

            startedAt:
                new Date().toISOString()
        };

        /*
         * 1. Syntax
         */

        const syntax =
            await this.syntaxValidator(
                workspace.files
            );

        result.checks.push(
            syntax
        );

        if (!syntax.passed) {
            result.passed = false;
        }

        /*
         * 2. Contract
         */

        const contract =
            await this.contractValidator(
                workspace.files,
                requirements
            );

        result.checks.push(
            contract
        );

        if (!contract.passed) {
            result.passed = false;
        }

        /*
         * 3. Tests
         */

        if (
            result.passed &&
            this.testRunner
        ) {

            const tests =
                await this.testRunner(
                    workspace.files,
                    requirements
                );

            result.checks.push(
                tests
            );

            if (!tests.passed) {
                result.passed = false;
            }
        }

        /*
         * 4. Regression
         */

        if (
            result.passed &&
            this.regressionRunner
        ) {

            const regression =
                await this.regressionRunner(
                    workspace.files,
                    requirements
                );

            result.checks.push(
                regression
            );

            if (
                !regression.passed
            ) {
                result.passed = false;
            }
        }

        result.finishedAt =
            new Date().toISOString();

        return result;
    }
}

async function defaultSyntaxValidator(
    files
) {

    const failures = [];

    for (
        const [
            path,
            source
        ] of Object.entries(files)
    ) {

        if (
            !/\.(js|cjs|mjs)$/
                .test(path)
        ) {
            continue;
        }

        try {

            /*
             * Chỉ parse syntax.
             *
             * KHÔNG EXECUTE CODE.
             */

            new Function(
                `"use strict";\n${source}`
            );

        } catch (error) {

            failures.push({
                path,

                message:
                    error.message
            });
        }
    }

    return {

        type: "SYNTAX",

        passed:
            failures.length === 0,

        failures
    };
}

async function defaultContractValidator(
    files,
    requirements
) {

    const failures = [];

    const requiredFiles =
        requirements
            ?.requiredFiles ||
        [];

    for (
        const file of
        requiredFiles
    ) {

        if (
            !Object.prototype
                .hasOwnProperty
                .call(files, file)
        ) {

            failures.push({
                type:
                    "MISSING_FILE",

                path:
                    file
            });
        }
    }

    return {

        type:
            "CONTRACT",

        passed:
            failures.length === 0,

        failures
    };
}

module.exports = {
    VerificationController
};
