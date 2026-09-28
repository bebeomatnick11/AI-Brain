"use strict";

const {
    SkillValidator
} = require("./SkillValidator");

const {
    SkillSandbox
} = require("./SkillSandbox");

class SkillExecutionManager {

    constructor(options = {}) {

        this.validator =
            options.validator ||
            new SkillValidator();

        this.sandbox =
            options.sandbox ||
            new SkillSandbox();

        this.errorCenter =
            options.errorCenter ||
            null;

        this.audit =
            options.audit ||
            null;
    }

    async run(
        skill,
        input = {},
        actor = {}
    ) {

        if (!skill) {

            throw new Error(
                "SKILL_NOT_FOUND"
            );
        }

        if (
            skill.status !==
            "ENABLED" &&
            skill.status !==
            "DRAFT"
        ) {

            throw new Error(
                "SKILL_NOT_EXECUTABLE"
            );
        }

        const validation =
            this.validator
                .validateDefinition(
                    skill
                );

        if (!validation.valid) {

            throw new Error(
                `SKILL_INVALID:${JSON.stringify(
                    validation.errors
                )}`
            );
        }

        if (
            Number(skill.level) === 1
        ) {

            throw new Error(
                "LEVEL_1_REQUIRES_SKILL_ENGINE"
            );
        }

        if (
            Number(skill.level) === 3
        ) {

            throw new Error(
                "LEVEL_3_REQUIRES_BUILDER_PIPELINE"
            );
        }

        const codeValidation =
            this.validator
                .validateCode(
                    skill.code
                );

        if (
            !codeValidation.valid
        ) {

            throw new Error(
                `SKILL_SYNTAX_INVALID:${JSON.stringify(
                    codeValidation.errors
                )}`
            );
        }

        const started =
            Date.now();

        try {

            const result =
                await this.sandbox.execute({

                    code:
                        skill.code,

                    args:
                        input,

                    permissions:
                        skill.permissions,

                    capabilities:
                        skill.capabilities
                });

            const execution = {

                status:
                    "SUCCESS",

                skillId:
                    skill.id,

                durationMs:
                    Date.now() -
                    started,

                result
            };

            await this.audit?.record(
                "skill.execution.success",
                {
                    skillId:
                        skill.id,

                    durationMs:
                        execution.durationMs
                },
                actor
            );

            return execution;

        } catch (error) {

            await this.errorCenter
                ?.report({

                    category:
                        "skill-execution",

                    skillId:
                        skill.id,

                    severity:
                        "ERROR",

                    message:
                        error.message,

                    stackTrace:
                        error.stack
                });

            await this.audit?.record(
                "skill.execution.failed",
                {
                    skillId:
                        skill.id,

                    error:
                        error.message
                },
                actor
            );

            throw error;
        }
    }
}

module.exports = {
    SkillExecutionManager
};
