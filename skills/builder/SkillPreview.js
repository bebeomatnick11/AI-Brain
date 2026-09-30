"use strict";

class SkillPreview {

    constructor(options = {}) {

        this.audit =
            options.audit || null;
    }

    async create(
        input = {}
    ) {

        const skill =
            input.skill || {};

        const validation =
            input.validation || {};

        return {

            name:
                skill.name,

            description:
                skill.description,

            level:
                skill.level,

            capabilities:
                skill.capabilities ||
                [],

            permissions:
                skill.permissions ||
                [],

            dependencies:
                skill.dependencies ||
                [],

            validation: {

                valid:
                    Boolean(
                        validation.valid
                    ),

                errors:
                    validation.errors ||
                    []
            },

            productionAccess:
                false,

            autoInstall:
                false,

            requiresApproval:
                true,

            status:
                "PREVIEW"
        };
    }
}

module.exports = {
    SkillPreview
};
