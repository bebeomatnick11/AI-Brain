"use strict";

const {
    CodingContext
} = require("./CodingContext");

const {
    CodingPlanner
} = require("./CodingPlanner");

const {
    CodeAnalyzer
} = require("./CodeAnalyzer");

class CodingAgent {

    constructor(options = {}) {

        this.planner =
            options.planner ||
            new CodingPlanner();

        this.analyzer =
            options.analyzer ||
            new CodeAnalyzer();

        this.modification =
            options.modification;

        this.verificationLoop =
            options.verificationLoop;

        this.provider =
            options.provider ||
            null;

        this.audit =
            options.audit ||
            null;
    }

    async repair(
        input = {},
        actor = {}
    ) {

        const context =
            new CodingContext({
                workspaceId:
                    input.workspace?.id,

                files:
                    input.workspace?.files,

                requirements:
                    input.requirements,

                errors:
                    input.errors
            });

        const plan =
            await this.planner.plan({
                task:
                    input.task,

                error:
                    input.error,

                requirements:
                    input.requirements
            });

        const analysis =
            this.analyzer.analyze(
                context.files,
                context.requirements
            );

        /*
         * Provider hiện tại của Astra Brain
         * chịu trách nhiệm tạo patch.
         */

        if (
            !this.provider?.generatePatch
        ) {

            return {

                status:
                    "PATCH_GENERATOR_UNAVAILABLE",

                plan,

                analysis,

                context:
                    context.toJSON()
            };
        }

        const patch =
            await this.provider
                .generatePatch({
                    task:
                        input.task,

                    error:
                        input.error,

                    plan,

                    analysis,

                    files:
                        context.files,

                    requirements:
                        input.requirements
                });

        return {

            status:
                "PATCH_GENERATED",

            plan,

            analysis,

            patch,

            context:
                context.toJSON()
        };
    }
}

module.exports = {
    CodingAgent
};
