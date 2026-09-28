"use strict";

const ORDER = Object.freeze({
    DRAFT: 0,
    TESTING: 1,
    APPROVED: 2,
    CANARY: 3,
    GLOBAL: 4
});

class DeploymentGate {

    constructor(options = {}) {

        this.audit =
            options.audit || null;
    }

    canDeploy(
        proposal,
        verification,
        target
    ) {

        if (!proposal) {

            return deny(
                "PROPOSAL_REQUIRED"
            );
        }

        if (
            !verification ||
            verification.status !==
            "PASSED"
        ) {

            return deny(
                "VERIFICATION_REQUIRED"
            );
        }

        if (
            proposal.status !==
            "APPROVED"
        ) {

            return deny(
                "APPROVAL_REQUIRED"
            );
        }

        if (
            target === "GLOBAL" &&
            proposal.requiresOwner
        ) {

            if (
                !proposal.approvedBy
            ) {

                return deny(
                    "OWNER_APPROVAL_REQUIRED"
                );
            }
        }

        return {
            allowed: true,
            reason: "DEPLOYMENT_ALLOWED"
        };
    }

    async deploy(
        proposal,
        verification,
        target,
        actor
    ) {

        const gate =
            this.canDeploy(
                proposal,
                verification,
                target
            );

        if (!gate.allowed) {

            throw new Error(
                gate.reason
            );
        }

        const result = {

            proposalId:
                proposal.id,

            target,

            status:
                target === "GLOBAL"
                    ? "DEPLOYED"
                    : target,

            deployedBy:
                actor?.id || null,

            deployedAt:
                new Date().toISOString()
        };

        await this.audit?.record(
            "deployment.executed",
            result,
            actor
        );

        return result;
    }
}

function deny(reason) {

    return {
        allowed: false,
        reason
    };
}

module.exports = {
    DeploymentGate,
    ORDER
};
