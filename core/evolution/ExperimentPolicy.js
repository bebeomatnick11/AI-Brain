"use strict";

class ExperimentPolicy {

    constructor(input = {}) {

        this.filterLevel =
            clamp(
                Number(
                    input.filterLevel ??
                    100
                ),
                0,
                100
            );

        this.ethicalPolicy =
            input.ethicalPolicy ||
            "strict";

        this.permissionPolicy =
            "strict";

        this.sandbox =
            true;

        this.secretProtection =
            true;

        this.auditLogging =
            true;

        this.productionAccess =
            false;

        this.authentication =
            true;

        this.authorization =
            true;
    }

    get behaviorFilter() {

        return this.filterLevel > 0;
    }

    get status() {

        if (this.filterLevel === 0) {
            return "NO_BEHAVIOR_FILTER";
        }

        if (this.filterLevel <= 25) {
            return "HIGH_RISK_EXPERIMENTAL";
        }

        if (this.filterLevel <= 50) {
            return "EXPERIMENTAL";
        }

        if (this.filterLevel <= 75) {
            return "RESTRICTED";
        }

        return "FULL_SAFETY_FILTER";
    }

    toJSON() {

        return {
            filterLevel:
                this.filterLevel,

            behaviorFilter:
                this.behaviorFilter,

            status:
                this.status,

            ethicalPolicy:
                this.ethicalPolicy,

            permissionPolicy:
                this.permissionPolicy,

            sandbox:
                this.sandbox,

            secretProtection:
                this.secretProtection,

            auditLogging:
                this.auditLogging,

            authentication:
                this.authentication,

            authorization:
                this.authorization,

            productionAccess:
                false
        };
    }
}

function clamp(value, min, max) {

    if (!Number.isFinite(value)) {
        return max;
    }

    return Math.max(
        min,
        Math.min(max, value)
    );
}

module.exports = {
    ExperimentPolicy
};
