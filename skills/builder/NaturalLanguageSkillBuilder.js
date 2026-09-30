"use strict";

class NaturalLanguageSkillBuilder {

    constructor(options = {}) {

        this.intentEngine =
            options.intentEngine || null;

        this.planner =
            options.planner || null;

        this.architecturePlanner =
            options.architecturePlanner;

        this.generator =
            options.generator;

        this.validator =
            options.validator;

        this.preview =
            options.preview;

        this.audit =
            options.audit || null;
    }

    async build(
        request,
        context = {},
        actor = {}
    ) {

        if (
            typeof request !== "string" ||
            !request.trim()
        ) {
            throw new Error(
                "SKILL_REQUEST_REQUIRED"
            );
        }

        const intent =
            await this.detectIntent(
                request,
                context
            );

        const requirements =
            await this.extractRequirements(
                request,
                intent,
                context
            );

        const architecture =
            await this.architecturePlanner.plan(
                {
                    request,
                    intent,
                    requirements,
                    context
                }
            );

        const generated =
            await this.generator.generate(
                {
                    request,
                    intent,
                    requirements,
                    architecture
                }
            );

        const validation =
            this.validator.validateDefinition(
                generated
            );

        const preview =
            await this.preview.create(
                {
                    request,
                    intent,
                    requirements,
                    architecture,
                    skill:
                        generated,
                    validation
                }
            );

        const result = {

            status:
                validation.valid
                    ? "PREVIEW_READY"
                    : "VALIDATION_FAILED",

            request,

            intent,

            requirements,

            architecture,

            skill:
                generated,

            validation,

            preview,

            createdBy:
                actor.id || null,

            createdAt:
                new Date().toISOString()
        };

        await this.audit?.record(
            "skill.builder.completed",
            {
                status:
                    result.status,

                skillName:
                    generated.name
            },
            actor
        );

        return result;
    }

    async detectIntent(
        request,
        context
    ) {

        if (
            this.intentEngine?.detect
        ) {

            return this.intentEngine.detect(
                request,
                context
            );
        }

        return {
            type:
                "CREATE_SKILL",

            rawRequest:
                request
        };
    }

    async extractRequirements(
        request,
        intent,
        context
    ) {

        if (
            this.planner?.requirements
        ) {

            return this.planner.requirements(
                {
                    request,
                    intent,
                    context
                }
            );
        }

        return {
            goal:
                request,

            inputs: {},

            outputs: {},

            capabilities: [],

            permissions: [],

            constraints: [],

            tests: []
        };
    }
}

module.exports = {
    NaturalLanguageSkillBuilder
};
