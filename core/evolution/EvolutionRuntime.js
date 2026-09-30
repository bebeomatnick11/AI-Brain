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

const {
    SkillValidator
} = require("../../skills/SkillValidator");

const {
    SkillSandbox
} = require("../../skills/SkillSandbox");

const {
    SkillExecutionManager
} = require("../../skills/SkillExecutionManager");

const {
    TestEngine
} = require("./TestEngine");

const {
    RegressionEngine
} = require("./RegressionEngine");

const {
    ErrorDiagnoser
} = require("./ErrorDiagnoser");

const {
    CodeRepairEngine
} = require("./CodeRepairEngine");

const {
    CodingVerificationLoop
} = require("./CodingVerificationLoop");

const {
    NaturalLanguageSkillBuilder
} = require(
    "../../skills/builder/NaturalLanguageSkillBuilder"
);

const {
    SkillArchitecturePlanner
} = require(
    "../../skills/builder/SkillArchitecturePlanner"
);

const {
    SkillGenerator
} = require(
    "../../skills/builder/SkillGenerator"
);

const {
    SkillPreview
} = require(
    "../../skills/builder/SkillPreview"
);

const {
    SkillBuildPipeline
} = require(
    "../../skills/builder/SkillBuildPipeline"
);

const {
    CodingAgent
} = require(
    "../../agent/mini/coding/CodingAgent"
);

const {
    CodingPipeline
} = require(
    "../../agent/mini/coding/CodingPipeline"
);

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

        this.skillValidator =
    new SkillValidator();

this.skillSandbox =
    new SkillSandbox();

this.skillExecutor =
    new SkillExecutionManager({

        validator:
            this.skillValidator,

        sandbox:
            this.skillSandbox,

        errorCenter:
            this.errorCenter,

        audit:
            this.audit
    });

this.testEngine =
    new TestEngine({

        skillExecutor:
            this.skillExecutor,

        audit:
            this.audit
    });

this.regressionEngine =
    new RegressionEngine({

        testEngine:
            this.testEngine,

        audit:
            this.audit
    });

this.errorDiagnoser =
    new ErrorDiagnoser({

        audit:
            this.audit
    });

this.codeRepair =
    new CodeRepairEngine({

        workspace:
            this.modification.workspace,

        diagnoser:
            this.errorDiagnoser,

        audit:
            this.audit
    });

this.codingLoop =
    new CodingVerificationLoop({

        verifier:
            this.modification.verifier,

        diagnoser:
            this.errorDiagnoser,

        repairEngine:
            this.codeRepair,

        audit:
            this.audit
    });
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
        this.skillArchitecturePlanner =
    new SkillArchitecturePlanner({

        capabilityRegistry:
            options.capabilityRegistry,

        audit:
            this.audit
    });


this.skillGenerator =
    new SkillGenerator({

        provider:
            options.skillGenerationProvider
    });


this.skillPreview =
    new SkillPreview({

        audit:
            this.audit
    });


this.skillBuilder =
    new NaturalLanguageSkillBuilder({

        intentEngine:
            options.intentEngine,

        planner:
            options.planner,

        architecturePlanner:
            this.skillArchitecturePlanner,

        generator:
            this.skillGenerator,

        validator:
            this.skillValidator,

        preview:
            this.skillPreview,

        audit:
            this.audit
    });


this.skillBuildPipeline =
    new SkillBuildPipeline({

        builder:
            this.skillBuilder,

        skillRegistry:
            this.skills,

        skillExecutor:
            this.skillExecutor,

        audit:
            this.audit
    });
        this.codingAgent =
    new CodingAgent({

        planner:
            undefined,

        analyzer:
            undefined,

        modification:
            this.modification,

        verificationLoop:
            this.codingLoop,

        provider:
            options.codingProvider,

        audit:
            this.audit
    });


this.codingPipeline =
    new CodingPipeline({

        agent:
            this.codingAgent,

        modification:
            this.modification,

        verificationLoop:
            this.codingLoop,

        audit:
            this.audit
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
