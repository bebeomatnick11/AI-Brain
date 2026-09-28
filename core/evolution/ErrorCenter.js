"use strict";

const crypto = require("crypto");
const { RISK_LEVELS } = require("./RiskEngine");

class ErrorCenter {

    constructor(options = {}) {

        this.db = options.db || null;
        this.audit = options.audit || null;
        this.eventBus = options.eventBus || null;
        this.logger = options.logger || console;
    }

    async report(input = {}) {

        const error = normalizeError(input);

        this.logger.error(
            `[ERROR CENTER] ${error.severity} ${error.id} ${error.message}`
        );

        if (this.eventBus?.emit) {

            try {
                await this.eventBus.emit(
                    "error.detected",
                    error
                );
            } catch (_) {}
        }

        if (this.db?.query) {

            await this.db.query(
                `
                INSERT INTO error_events
                (
                    id,
                    brain_id,
                    agent_id,
                    skill_id,
                    run_id,
                    severity,
                    category,
                    message,
                    redacted_context,
                    stack_trace,
                    visibility,
                    status,
                    requires_approval,
                    created_at
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
                `,
                [
                    error.id,
                    error.brainId,
                    error.agentId,
                    error.skillId,
                    error.runId,
                    error.severity,
                    error.category,
                    error.message,
                    JSON.stringify(error.context),
                    error.stackTrace,
                    error.visibility,
                    error.status,
                    error.requiresApproval
                ]
            );
        }

        if (this.audit) {

            await this.audit.record(
                "error.detected",
                error
            );
        }

        return error;
    }

    async resolve(errorId, actor) {

        if (this.db?.query) {

            await this.db.query(
                `
                UPDATE error_events
                SET
                    status = 'RESOLVED',
                    resolved_at = NOW()
                WHERE id = $1
                `,
                [errorId]
            );
        }

        if (this.audit) {

            await this.audit.record(
                "error.resolved",
                { errorId },
                actor
            );
        }

        return {
            errorId,
            status: "RESOLVED"
        };
    }
}

function normalizeError(input) {

    const severity =
        String(input.severity || "ERROR")
            .toUpperCase();

    const critical =
        severity === RISK_LEVELS.CRITICAL ||
        severity === "SECURITY";

    return {

        id:
            input.id ||
            `ERR-${Date.now()}-${crypto
                .randomBytes(4)
                .toString("hex")}`,

        brainId:
            input.brainId ||
            "global",

        agentId:
            input.agentId ||
            null,

        skillId:
            input.skillId ||
            null,

        runId:
            input.runId ||
            null,

        severity,

        category:
            input.category ||
            "runtime",

        message:
            redact(
                String(
                    input.message ||
                    "Unknown error"
                )
            ),

        context:
            sanitize(
                input.context || {}
            ),

        stackTrace:
            redact(
                String(
                    input.stackTrace ||
                    ""
                )
            ),

        visibility:
            critical ||
            input.visibility === "private"
                ? "private"
                : "normal",

        requiresApproval:
            critical ||
            input.requiresApproval === true,

        status:
            "OPEN",

        createdAt:
            new Date().toISOString()
    };
}

function redact(value) {

    return value.replace(
        /(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?[^"',\s}]+/gi,
        "$1=[REDACTED]"
    );
}

function sanitize(value) {

    if (!value || typeof value !== "object") {
        return {};
    }

    if (Array.isArray(value)) {
        return value.map(sanitize);
    }

    const result = {};

    for (const [key, item] of Object.entries(value)) {

        if (
            /api[_-]?key|token|secret|password|authorization/i
                .test(key)
        ) {
            result[key] = "[REDACTED]";
        } else if (
            item &&
            typeof item === "object"
        ) {
            result[key] = sanitize(item);
        } else if (
            typeof item === "string"
        ) {
            result[key] = redact(item);
        } else {
            result[key] = item;
        }
    }

    return result;
}

module.exports = {
    ErrorCenter
};
