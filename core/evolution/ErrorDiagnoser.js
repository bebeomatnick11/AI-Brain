"use strict";

class ErrorDiagnoser {

    constructor(options = {}) {

        this.audit =
            options.audit ||
            null;
    }

    diagnose(
        error,
        context = {}
    ) {

        const message =
            String(
                error?.message ||
                error ||
                ""
            );

        let category =
            "unknown";

        if (
            /syntax|unexpected token/i
                .test(message)
        ) {

            category =
                "syntax";

        } else if (
            /timeout/i
                .test(message)
        ) {

            category =
                "timeout";

        } else if (
            /not found|cannot find|module/i
                .test(message)
        ) {

            category =
                "dependency";

        } else if (
            /permission|forbidden|unauthorized/i
                .test(message)
        ) {

            category =
                "permission";

        } else if (
            /contract|missing|required/i
                .test(message)
        ) {

            category =
                "contract";

        } else if (
            /assert|test failed/i
                .test(message)
        ) {

            category =
                "test";

        } else {

            category =
                "runtime";
        }

        const diagnosis = {

            category,

            message,

            likelyCause:
                inferCause(
                    category,
                    message
                ),

            context,

            repairable:
                ![
                    "permission",
                    "security"
                ].includes(category),

            createdAt:
                new Date().toISOString()
        };

        this.audit?.record(
            "code.error.diagnosed",
            diagnosis
        );

        return diagnosis;
    }
}

function inferCause(
    category,
    message
) {

    switch (category) {

        case "syntax":
            return "Generated or edited source contains invalid syntax.";

        case "dependency":
            return "A required module or dependency is unavailable.";

        case "permission":
            return "The operation is outside the allowed permission boundary.";

        case "contract":
            return "The implementation does not satisfy the required contract.";

        case "test":
            return "One or more expected behaviors failed.";

        case "timeout":
            return "Execution exceeded the configured time limit.";

        case "runtime":
            return "The code threw an exception while running.";

        default:
            return "Cause could not be classified automatically.";
    }
}

module.exports = {
    ErrorDiagnoser
};
