"use strict";

const assert =
    require("assert");

class TestEngine {

    constructor(options = {}) {

        this.skillExecutor =
            options.skillExecutor ||
            null;

        this.apiTester =
            options.apiTester ||
            null;

        this.audit =
            options.audit ||
            null;
    }

    async run(
        input = {},
        actor = {}
    ) {

        const results = [];

        /*
         * UNIT TESTS
         */

        if (
            Array.isArray(
                input.unitTests
            )
        ) {

            for (
                const test of
                input.unitTests
            ) {

                results.push(
                    await this.runUnitTest(
                        test
                    )
                );
            }
        }

        /*
         * SKILL TEST
         */

        if (
            input.skill
        ) {

            results.push(
                await this.runSkillTest(
                    input.skill,
                    input.skillInputs ||
                    []
                )
            );
        }

        /*
         * API TEST
         */

        if (
            Array.isArray(
                input.apiTests
            ) &&
            this.apiTester
        ) {

            for (
                const test of
                input.apiTests
            ) {

                results.push(
                    await this.apiTester(
                        test
                    )
                );
            }
        }

        const passed =
            results.every(
                result =>
                    result.passed
            );

        const report = {

            type:
                "TEST",

            passed,

            total:
                results.length,

            passedCount:
                results.filter(
                    r => r.passed
                ).length,

            failedCount:
                results.filter(
                    r => !r.passed
                ).length,

            results,

            createdAt:
                new Date().toISOString()
        };

        await this.audit?.record(
            passed
                ? "tests.passed"
                : "tests.failed",
            report,
            actor
        );

        return report;
    }

    async runUnitTest(
        test
    ) {

        try {

            if (
                typeof test.run !==
                "function"
            ) {

                throw new Error(
                    "TEST_FUNCTION_REQUIRED"
                );
            }

            await test.run({
                assert
            });

            return {

                type:
                    "UNIT",

                name:
                    test.name ||
                    "Unnamed",

                passed:
                    true
            };

        } catch (error) {

            return {

                type:
                    "UNIT",

                name:
                    test.name ||
                    "Unnamed",

                passed:
                    false,

                error:
                    error.message,

                stack:
                    error.stack
            };
        }
    }

    async runSkillTest(
        skill,
        inputs
    ) {

        if (
            !this.skillExecutor
        ) {

            return {

                type:
                    "SKILL",

                passed:
                    false,

                error:
                    "SKILL_EXECUTOR_UNAVAILABLE"
            };
        }

        const results = [];

        for (
            const input of
            inputs
        ) {

            try {

                const output =
                    await this.skillExecutor.run(
                        skill,
                        input
                    );

                results.push({
                    input,
                    passed: true,
                    output:
                        output.result
                });

            } catch (error) {

                results.push({
                    input,
                    passed: false,
                    error:
                        error.message
                });
            }
        }

        return {

            type:
                "SKILL",

            passed:
                results.every(
                    r => r.passed
                ),

            results
        };
    }
}

module.exports = {
    TestEngine
};
