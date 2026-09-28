"use strict";

const crypto = require("crypto");

class AuditLogger {

    constructor(options = {}) {
        this.db = options.db || null;
        this.logger = options.logger || console;
    }

    async record(type, payload = {}, actor = {}) {

        const event = {
            id: crypto.randomUUID(),
            type,
            actorId: actor.id || null,
            actorRole: actor.role || null,
            payload: sanitize(payload),
            createdAt: new Date().toISOString()
        };

        this.logger.info(
            `[AUDIT] ${event.type} ${event.id}`
        );

        if (this.db?.query) {

            await this.db.query(
                `
                INSERT INTO audit_logs
                (
                    id,
                    event_type,
                    actor_id,
                    actor_role,
                    payload,
                    created_at
                )
                VALUES ($1,$2,$3,$4,$5,NOW())
                `,
                [
                    event.id,
                    event.type,
                    event.actorId,
                    event.actorRole,
                    JSON.stringify(event.payload)
                ]
            );
        }

        return event;
    }
}

function sanitize(value) {

    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "string") {

        return value
            .replace(
                /(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?[^"',\s}]+/gi,
                "$1=[REDACTED]"
            );
    }

    if (Array.isArray(value)) {
        return value.map(sanitize);
    }

    if (typeof value === "object") {

        const result = {};

        for (const [key, item] of Object.entries(value)) {

            if (
                /api[_-]?key|token|secret|password|authorization/i
                    .test(key)
            ) {
                result[key] = "[REDACTED]";
            } else {
                result[key] = sanitize(item);
            }
        }

        return result;
    }

    return value;
}

module.exports = {
    AuditLogger
};
