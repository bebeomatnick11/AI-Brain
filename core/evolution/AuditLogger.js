"use strict";

const RISK_LEVELS = Object.freeze({
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL"
});

const CRITICAL_AREAS = new Set([
    "authentication",
    "authorization",
    "permission",
    "approval",
    "sandbox",
    "secret",
    "secret-vault",
    "core-runtime",
    "security-policy",
    "deployment"
]);

const HIGH_AREAS = new Set([
    "agent-loop",
    "brain-runtime",
    "capability-router",
    "provider-router",
    "memory",
    "database",
    "skill-engine",
    "version-manager"
]);

class RiskEngine {

    classify(change = {}) {

        const areas = Array.isArray(change.areas)
            ? change.areas.map(String)
            : [];

        if (
            areas.some(area => CRITICAL_AREAS.has(area)) ||
            change.modifiesSecurity === true ||
            change.modifiesAuth === true ||
            change.modifiesSandbox === true ||
            change.modifiesSecrets === true
        ) {
            return RISK_LEVELS.CRITICAL;
        }

        if (
            areas.some(area => HIGH_AREAS.has(area)) ||
            change.affectsCore === true
        ) {
            return RISK_LEVELS.HIGH;
        }

        if (
            change.affectsSkill === true ||
            change.affectsBackend === true
        ) {
            return RISK_LEVELS.MEDIUM;
        }

        return RISK_LEVELS.LOW;
    }

    requiresOwnerApproval(level) {
        return (
            level === RISK_LEVELS.HIGH ||
            level === RISK_LEVELS.CRITICAL
        );
    }

    requiresExtraReview(level) {
        return level === RISK_LEVELS.CRITICAL;
    }

    describe(level) {

        switch (level) {

            case RISK_LEVELS.LOW:
                return "Low-risk change.";

            case RISK_LEVELS.MEDIUM:
                return "May affect a Skill or backend behavior.";

            case RISK_LEVELS.HIGH:
                return "May affect the Global Brain or connected Agents.";

            case RISK_LEVELS.CRITICAL:
                return "May affect authentication, permissions, sandbox, secrets, deployment or core security.";

            default:
                return "Unknown risk.";
        }
    }
}

module.exports = {
    RiskEngine,
    RISK_LEVELS
};
