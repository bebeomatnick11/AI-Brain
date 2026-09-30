"use strict";

class SkillGenerator {

    constructor(options = {}) {

        this.provider =
            options.provider || null;
    }

    async generate(
        input = {}
    ) {

        const {
            request,
            intent,
            requirements,
            architecture
        } = input;

        if (
            this.provider?.generateSkill
        ) {

            const generated =
                await this.provider
                    .generateSkill({
                        request,
                        intent,
                        requirements,
                        architecture
                    });

            return normalizeSkill(
                generated,
                architecture
            );
        }

        /*
         * Không có AI provider:
         *
         * tạo deterministic draft,
         * KHÔNG giả vờ đây là AI-generated code.
         */

        return {

            name:
                createName(
                    request
                ),

            description:
                request,

            level:
                architecture.level,

            trigger:
                null,

            input:
                architecture.inputSchema,

            output:
                architecture.outputSchema,

            permissions:
                architecture.permissions,

            capabilities:
                architecture.capabilities,

            dependencies:
                architecture.dependencies,

            conditions:
                [],

            code:
                null,

            status:
                "DRAFT",

            generation:
                "PLANNED_ONLY"
        };
    }
}

function normalizeSkill(
    skill,
    architecture
) {

    return {

        ...skill,

        level:
            architecture.level,

        input:
            skill.input ||
            architecture.inputSchema,

        output:
            skill.output ||
            architecture.outputSchema,

        permissions:
            architecture.permissions,

        capabilities:
            architecture.capabilities,

        dependencies:
            architecture.dependencies,

        scope:
            "experiment",

        status:
            "DRAFT"
    };
}

function createName(
    request
) {

    return String(request)
        .trim()
        .slice(0, 60)
        .replace(
            /\s+/g,
            " "
        );
}

module.exports = {
    SkillGenerator
};
