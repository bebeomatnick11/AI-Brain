"use strict";

const {
    RiskEngine
} = require("./RiskEngine");

const {
    AuditLogger
} = require("./AuditLogger");

const {
    ErrorCenter
} = require("./ErrorCenter");

const {
    ApprovalEngine
} = require("./ApprovalEngine");

const {
    SkillRegistry
} = require("./SkillRegistry");

const {
    ExperimentLab
} = require("./ExperimentLab");

class EvolutionRuntime {

    constructor(options = {}) {

        this.db =
            options.db ||
            null;

        this.eventBus =
            options.eventBus ||
            null;

        this.logger =
            options.logger ||
            console;

        this.riskEngine =
            new RiskEngine();

        this.audit =
            new AuditLogger({
                db: this.db,
                logger: this.logger
            });

        this.errorCenter =
            new ErrorCenter({
                db: this.db,
                audit: this.audit,
                eventBus: this.eventBus,
                logger: this.logger
            });

        this.approval =
            new ApprovalEngine({
                db: this.db,
                audit: this.audit,
                riskEngine:
                    this.riskEngine
            });

        this.skills =
            new SkillRegistry({
                db: this.db,
                audit: this.audit
            });

        this.experiments =
            new ExperimentLab({
                db: this.db,
                audit: this.audit,
                skillRegistry:
                    this.skills
            });
    }

    async reportError(error) {

        return this.errorCenter.report(
            error
        );
    }

    async createSkill(
        definition,
        actor
    ) {

        return this.skills.create(
            definition,
            actor
        );
    }

    async createExperiment(
        input,
        actor
    ) {

        return this.experiments.create(
            input,
            actor
        );
    }

    async createChangeProposal(
        input,
        actor
    ) {

        return this.approval
            .createProposal(
                input,
                actor
            );
    }
}

module.exports = {
    EvolutionRuntime
};
