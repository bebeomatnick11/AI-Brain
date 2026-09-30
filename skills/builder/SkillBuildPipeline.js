"use strict";

class SkillBuildPipeline {

    constructor(options = {}) {

        this.builder =
            options.builder;

        this.skillRegistry =
            options.skillRegistry;

        this.skillExecutor =
            options.skillExecutor;

        this.audit =
            options.audit || null;
    }

    async build(
        request,
        context,
        actor
    ) {

        return this.builder.build(
            request,
            context,
            actor
        );
    }

    async approve(
        preview,
        actor
    ) {

        if (
            !preview ||
            preview.status !==
            "PREVIEW_READY"
        ) {

            throw new Error(
                "SKILL_PREVIEW_NOT_READY"
            );
        }

        if (
            !actor ||
            ![
                "Owner",
                "Admin",
                "Developer",
                "Collaborator",
                "User"
            ].includes(
                actor.role
            )
        ) {

            throw new Error(
                "SKILL_APPROVAL_DENIED"
            );
        }

        const skill =
            await this.skillRegistry.create(
                {
                    ...preview.skill,

                    status:
                        "DRAFT"
                },
                actor
            );

        await this.audit?.record(
            "skill.builder.approved",
            {
                skillId:
                    skill.id
            },
            actor
        );

        return skill;
    }

    async test(
        skill,
        inputs,
        actor
    ) {

        if (
            !this.skillExecutor
        ) {

            throw new Error(
                "SKILL_EXECUTOR_UNAVAILABLE"
            );
        }

        const results = [];

        for (
            const input of
            inputs || [{}]
        ) {

            try {

                const result =
                    await this.skillExecutor.run(
                        skill,
                        input,
                        actor
                    );

                results.push({
                    passed:
                        true,

                    input,

                    output:
                        result.result
                });

            } catch (error) {

                results.push({
                    passed:
                        false,

                    input,

                    error:
                        error.message
                });
            }
        }

        return {

            passed:
                results.every(
                    result =>
                        result.passed
                ),

            results
        };
    }
}

module.exports = {
    SkillBuildPipeline
};
