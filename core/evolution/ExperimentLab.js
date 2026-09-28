"use strict";

const crypto = require("crypto");
const {
    ExperimentPolicy
} = require("./ExperimentPolicy");

class ExperimentLab {

    constructor(options = {}) {

        this.db =
            options.db ||
            null;

        this.audit =
            options.audit ||
            null;

        this.skillRegistry =
            options.skillRegistry ||
            null;

        this.modificationEngine =
            options.modificationEngine ||
            null;

        this.experiments =
            new Map();
    }

    async create(
        input = {},
        actor
    ) {

        const experiment = {

            id:
                crypto.randomUUID(),

            name:
                input.name ||
                "Untitled Experiment",

            brainId:
                input.brainId ||
                "global",

            ownerId:
                actor.id,

            status:
                "DRAFT",

            policy:
                new ExperimentPolicy(
                    input.policy
                ).toJSON(),

            createdAt:
                new Date().toISOString()
        };

        this.experiments.set(
            experiment.id,
            experiment
        );

        if (this.db?.query) {

            await this.db.query(
                `
                INSERT INTO experiment_workspaces
                (
                    id,
                    brain_id,
                    name,
                    owner_id,
                    status,
                    policy,
                    created_at
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,NOW())
                `,
                [
                    experiment.id,
                    experiment.brainId,
                    experiment.name,
                    experiment.ownerId,
                    experiment.status,
                    JSON.stringify(
                        experiment.policy
                    )
                ]
            );
        }

        await this.audit?.record(
            "experiment.created",
            experiment,
            actor
        );

        return experiment;
    }

    get(id) {

        return this.experiments.get(
            id
        ) || null;
    }

    updatePolicy(
        id,
        patch,
        actor
    ) {

        const experiment =
            this.get(id);

        if (!experiment) {
            throw new Error(
                "EXPERIMENT_NOT_FOUND"
            );
        }

        const policy =
            new ExperimentPolicy({
                ...experiment.policy,
                ...patch
            });

        experiment.policy =
            policy.toJSON();

        experiment.updatedAt =
            new Date().toISOString();

        this.audit?.record(
            "experiment.policy.changed",
            {
                experimentId: id,
                policy: experiment.policy
            },
            actor
        );

        return experiment;
    }

    async createSkill(
        id,
        definition,
        actor
    ) {

        const experiment =
            this.get(id);

        if (!experiment) {
            throw new Error(
                "EXPERIMENT_NOT_FOUND"
            );
        }

        if (
            experiment.status ===
            "LOCKED"
        ) {
            throw new Error(
                "EXPERIMENT_LOCKED"
            );
        }

        if (
            experiment.policy
                .productionAccess
        ) {
            throw new Error(
                "EXPERIMENT_PRODUCTION_ACCESS_FORBIDDEN"
            );
        }

        if (!this.skillRegistry) {
            throw new Error(
                "SKILL_REGISTRY_UNAVAILABLE"
            );
        }

        return this.skillRegistry.create(
            {
                ...definition,
                scope: "experiment"
            },
            actor
        );
    }
}

module.exports = {
    ExperimentLab
};
