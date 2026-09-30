"use strict";

class CodingPlanner {

    async plan(
        input = {}
    ) {

        const {
            task,
            error,
            requirements = {}
        } = input;

        const steps = [];

        if (error) {

            steps.push({
                action:
                    "ANALYZE_ERROR",

                reason:
                    "Determine failure category."
            });
        }

        steps.push({
            action:
                "READ_RELEVANT_FILES",

            reason:
                "Understand existing implementation."
        });

        steps.push({
            action:
                "IDENTIFY_CONTRACT",

            reason:
                "Determine expected behavior."
        });

        steps.push({
            action:
                "PATCH_MINIMAL",

            reason:
                "Change only necessary code."
        });

        steps.push({
            action:
                "VERIFY_SYNTAX",

            reason:
                "Check syntax."
        });

        steps.push({
            action:
                "RUN_TESTS",

            reason:
                "Verify behavior."
        });

        steps.push({
            action:
                "REGRESSION",

            reason:
                "Check existing behavior."
        });

        return {

            task:
                task || null,

            requirements,

            steps
        };
    }
}

module.exports = {
    CodingPlanner
};
