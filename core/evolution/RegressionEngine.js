"use strict";

class RegressionEngine {

    constructor(options = {}) {

        this.testEngine =
            options.testEngine ||
            null;

        this.baselineProvider =
            options.baselineProvider ||
            null;

        this.audit =
            options.audit ||
            null;
    }

    async run(
        input = {},
        actor = {}
    ) {

        const baseline =
            this.baselineProvider
                ? await this
                    .baselineProvider(
                        input
                    )
                : null;

        if (!baseline) {

            /*
             * Không giả vờ rằng regression
             * đã chạy nếu chưa có baseline.
             */

            return {

                type:
                    "REGRESSION",

                passed:
                    false,

                status:
                    "BASELINE_UNAVAILABLE",

                error:
                    "REGRESSION_BASELINE_UNAVAILABLE"
            };
        }

        if (
            !this.testEngine
        ) {

            return {

                type:
                    "REGRESSION",

                passed:
                    false,

                status:
                    "TEST_ENGINE_UNAVAILABLE"
            };
        }

        const current =
            await this.testEngine.run(
                input,
                actor
            );

        const result = {

            type:
                "REGRESSION",

            passed:
                current.passed,

            status:
                current.passed
                    ? "PASSED"
                    : "FAILED",

            current,

            baseline
        };

        await this.audit?.record(
            result.passed
                ? "regression.passed"
                : "regression.failed",
            result,
            actor
        );

        return result;
    }
}

module.exports = {
    RegressionEngine
};
