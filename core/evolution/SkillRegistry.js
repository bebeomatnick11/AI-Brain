"use strict";

const crypto = require("crypto");

class SkillRegistry {

    constructor(options = {}) {

        this.db =
            options.db ||
            null;

        this.audit =
            options.audit ||
            null;

        this.skills =
            new Map();
    }

    async create(
        definition,
        actor
    ) {

        validateSkill(
            definition
        );

        const id =
            definition.id ||
            crypto.randomUUID();

        const skill = {

            id,

            name:
                definition.name,

            description:
                definition.description ||
                "",

            level:
                Number(
                    definition.level ||
                    1
                ),

            trigger:
                definition.trigger ||
                null,

            input:
                definition.input ||
                {},

            output:
                definition.output ||
                {},

            permissions:
                definition.permissions ||
                [],

            capabilities:
                definition.capabilities ||
                [],

            conditions:
                definition.conditions ||
                [],

            dependencies:
                definition.dependencies ||
                [],

            scope:
                definition.scope ||
                "global",

            status:
                "DRAFT",

            version:
                1,

            author:
                actor?.id ||
                "unknown",

            usageCount:
                0,

            successCount:
                0,

            errorCount:
                0,

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()
        };

        this.skills.set(
            id,
            skill
        );

        if (this.db?.query) {

            await this.db.query(
                `
                INSERT INTO skills
                (
                    id,
                    name,
                    description,
                    version,
                    author,
                    scope,
                    permissions,
                    dependencies,
                    status,
                    usage_count,
                    success_count,
                    error_count,
                    created_at,
                    updated_at
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
                `,
                [
                    skill.id,
                    skill.name,
                    skill.description,
                    skill.version,
                    skill.author,
                    skill.scope,
                    JSON.stringify(
                        skill.permissions
                    ),
                    JSON.stringify(
                        skill.dependencies
                    ),
                    skill.status,
                    0,
                    0,
                    0
                ]
            );
        }

        await this.audit?.record(
            "skill.created",
            skill,
            actor
        );

        return skill;
    }

    get(id) {

        return this.skills.get(
            id
        ) || null;
    }

    list() {

        return [
            ...this.skills.values()
        ];
    }

    async enable(
        id,
        actor
    ) {

        return this.changeStatus(
            id,
            "ENABLED",
            actor
        );
    }

    async disable(
        id,
        actor
    ) {

        return this.changeStatus(
            id,
            "DISABLED",
            actor
        );
    }

    async changeStatus(
        id,
        status,
        actor
    ) {

        const skill =
            this.get(id);

        if (!skill) {
            throw new Error(
                "SKILL_NOT_FOUND"
            );
        }

        skill.status =
            status;

        skill.updatedAt =
            new Date().toISOString();

        await this.audit?.record(
            "skill.status.changed",
            {
                skillId: id,
                status
            },
            actor
        );

        return skill;
    }
}

function validateSkill(
    definition
) {

    if (
        !definition ||
        typeof definition !==
        "object"
    ) {
        throw new Error(
            "INVALID_SKILL"
        );
    }

    if (
        !definition.name ||
        typeof definition.name !==
        "string"
    ) {
        throw new Error(
            "SKILL_NAME_REQUIRED"
        );
    }

    const level =
        Number(
            definition.level ||
            1
        );

    if (
        ![
            1,
            2,
            3
        ].includes(level)
    ) {
        throw new Error(
            "INVALID_SKILL_LEVEL"
        );
    }
}

module.exports = {
    SkillRegistry
};
