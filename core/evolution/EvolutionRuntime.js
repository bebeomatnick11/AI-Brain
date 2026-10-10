"use strict";

/*
 * ============================================================
 * ASTRA BRAIN — EVOLUTION RUNTIME
 * ============================================================
 *
 * Runtime trung tâm cho:
 *
 * Risk
 * Audit
 * Error
 * Approval
 * Skills
 * Experiments
 * Workspace / Modification
 * Testing
 * Regression
 * Coding Verification
 * Skill Builder
 * Coding Agent
 * ChangeSet
 * Diff
 * Snapshot
 * Version
 * Canary
 * Rollback
 * Deployment
 *
 * Không tự gọi external AI model.
 * ============================================================
 */


/*
 * ============================================================
 * CORE EVOLUTION
 * ============================================================
 */

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


/*
 * ============================================================
 * SKILL EXECUTION
 * ============================================================
 */

const {
    SkillValidator
} = require("../../skills/SkillValidator");

const {
    SkillSandbox
} = require("../../skills/SkillSandbox");

const {
    SkillExecutionManager
} = require("../../skills/SkillExecutionManager");


/*
 * ============================================================
 * TEST / REGRESSION
 * ============================================================
 */

const {
    TestEngine
} = require("./TestEngine");

const {
    RegressionEngine
} = require("./RegressionEngine");


/*
 * ============================================================
 * CODING VERIFICATION
 * ============================================================
 */

const {
    ErrorDiagnoser
} = require("./ErrorDiagnoser");

const {
    CodeRepairEngine
} = require("./CodeRepairEngine");

const {
    CodingVerificationLoop
} = require("./CodingVerificationLoop");


/*
 * ============================================================
 * SKILL BUILDER
 * ============================================================
 */

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


/*
 * ============================================================
 * MINI CODING AGENT
 * ============================================================
 */

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


/*
 * ============================================================
 * MODIFICATION / VERSION / DEPLOYMENT
 * ============================================================
 */

const {
    ModificationEngine
} = require(
    "./ModificationEngine"
);

const ChangeSet =
    require(
        "../modification/ChangeSet"
    );

const DiffEngine =
    require(
        "../modification/DiffEngine"
    );

const SnapshotManager =
    require(
        "../versions/SnapshotManager"
    );

const VersionManager =
    require(
        "../versions/VersionManager"
    );

const CanaryManager =
    require(
        "../deployment/CanaryManager"
    );

const RollbackManager =
    require(
        "../deployment/RollbackManager"
    );

const DeploymentManager =
    require(
        "../deployment/DeploymentManager"
    );


class EvolutionRuntime {

    constructor(options = {}) {

        /*
         * ====================================================
         * BASIC RUNTIME CONTEXT
         * ====================================================
         */

        this.db =
            options.db ||
            null;

        this.eventBus =
            options.eventBus ||
            null;

        this.logger =
            options.logger ||
            console;


        /*
         * ====================================================
         * RISK / AUDIT / ERROR
         *
         * IMPORTANT:
         * These must be created BEFORE components that depend
         * on them.
         * ====================================================
         */

        this.riskEngine =
            new RiskEngine();


        this.audit =
            new AuditLogger({
                db:
                    this.db,

                logger:
                    this.logger
            });


        this.errorCenter =
            new ErrorCenter({
                db:
                    this.db,

                audit:
                    this.audit,

                eventBus:
                    this.eventBus,

                logger:
                    this.logger
            });


        /*
         * ====================================================
         * APPROVAL
         * ====================================================
         */

        this.approval =
            new ApprovalEngine({
                db:
                    this.db,

                audit:
                    this.audit,

                riskEngine:
                    this.riskEngine
            });


        /*
         * ====================================================
         * SKILL REGISTRY
         * ====================================================
         */

        this.skills =
            new SkillRegistry({
                db:
                    this.db,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * SKILL VALIDATION / SANDBOX
         * ====================================================
         */

        this.skillValidator =
            new SkillValidator();


        this.skillSandbox =
            new SkillSandbox();


        /*
         * ====================================================
         * SKILL EXECUTION
         * ====================================================
         */

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


        /*
         * ====================================================
         * TEST ENGINE
         * ====================================================
         */

        this.testEngine =
            new TestEngine({

                skillExecutor:
                    this.skillExecutor,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * REGRESSION ENGINE
         * ====================================================
         */

        this.regressionEngine =
            new RegressionEngine({

                testEngine:
                    this.testEngine,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * EXPERIMENT LAB
         * ====================================================
         */

        this.experiments =
            new ExperimentLab({

                db:
                    this.db,

                audit:
                    this.audit,

                skillRegistry:
                    this.skills
            });


        /*
         * ====================================================
         * MODIFICATION ENGINE
         *
         * Must exist BEFORE:
         *
         * CodeRepairEngine
         * CodingVerificationLoop
         * CodingAgent
         * CodingPipeline
         * ====================================================
         */

        this.modification =
            new ModificationEngine({

                db:
                    this.db,

                audit:
                    this.audit,

                testRunner:
                    async (
                        files,
                        requirements = {}
                    ) => {

                        return this.testEngine.run({

                            unitTests:
                                requirements.unitTests,

                            skill:
                                requirements.skill,

                            skillInputs:
                                requirements.skillInputs,

                            files
                        });
                    },

                regressionRunner:
                    async (
                        files,
                        requirements = {}
                    ) => {

                        return this.regressionEngine.run({

                            files,

                            ...requirements
                        });
                    },

                versionManager:
                    options.versionManager ||
                    null
            });


        /*
         * ====================================================
         * ERROR DIAGNOSER
         * ====================================================
         */

        this.errorDiagnoser =
            new ErrorDiagnoser({

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * CODE REPAIR ENGINE
         * ====================================================
         */

        this.codeRepair =
            new CodeRepairEngine({

                workspace:
                    this.modification.workspace,

                diagnoser:
                    this.errorDiagnoser,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * CODING VERIFICATION LOOP
         * ====================================================
         */

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


        /*
         * ====================================================
         * CHANGE / DIFF
         * ====================================================
         */

        this.changeSet =
            ChangeSet;


        this.diffEngine =
            new DiffEngine({

                db:
                    this.db,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * SNAPSHOT
         * ====================================================
         */

        this.snapshotManager =
            new SnapshotManager({

                db:
                    this.db,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * VERSION
         * ====================================================
         */

        this.versionManager =
            options.versionManager ||

            new VersionManager({

                db:
                    this.db,

                audit:
                    this.audit,

                snapshotManager:
                    this.snapshotManager
            });


        /*
         * ====================================================
         * CONNECT VERSION MANAGER TO MODIFICATION
         * ====================================================
         */

        if (
            this.modification &&
            typeof this.modification.setVersionManager ===
                "function"
        ) {

            this.modification.setVersionManager(
                this.versionManager
            );
        }


        /*
         * ====================================================
         * CANARY
         * ====================================================
         */

        this.canaryManager =
            new CanaryManager({

                db:
                    this.db,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * ROLLBACK
         * ====================================================
         */

        this.rollbackManager =
            new RollbackManager({

                db:
                    this.db,

                audit:
                    this.audit,

                versionManager:
                    this.versionManager,

                snapshotManager:
                    this.snapshotManager
            });


        /*
         * ====================================================
         * DEPLOYMENT
         * ====================================================
         */

        this.deploymentManager =
            new DeploymentManager({

                db:
                    this.db,

                audit:
                    this.audit,

                versionManager:
                    this.versionManager,

                snapshotManager:
                    this.snapshotManager,

                canaryManager:
                    this.canaryManager,

                rollbackManager:
                    this.rollbackManager
            });


        /*
         * ====================================================
         * SKILL ARCHITECTURE PLANNER
         * ====================================================
         */

        this.skillArchitecturePlanner =
            new SkillArchitecturePlanner({

                capabilityRegistry:
                    options.capabilityRegistry ||
                    null,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * SKILL GENERATOR
         *
         * Không ép Astra phải dùng external model.
         * Nếu không có provider thì generator phải xử lý
         * theo contract của chính nó.
         * ====================================================
         */

        this.skillGenerator =
            new SkillGenerator({

                provider:
                    options.skillGenerationProvider ||
                    null
            });


        /*
         * ====================================================
         * SKILL PREVIEW
         * ====================================================
         */

        this.skillPreview =
            new SkillPreview({

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * NATURAL LANGUAGE SKILL BUILDER
         * ====================================================
         */

        this.skillBuilder =
            new NaturalLanguageSkillBuilder({

                intentEngine:
                    options.intentEngine ||
                    null,

                planner:
                    options.planner ||
                    null,

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


        /*
         * ====================================================
         * SKILL BUILD PIPELINE
         * ====================================================
         */

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


        /*
         * ====================================================
         * MINI CODING AGENT
         * ====================================================
         */

        this.codingAgent =
            new CodingAgent({

                planner:
                    options.codingPlanner ||
                    null,

                analyzer:
                    options.codeAnalyzer ||
                    null,

                modification:
                    this.modification,

                verificationLoop:
                    this.codingLoop,

                provider:
                    options.codingProvider ||
                    null,

                audit:
                    this.audit
            });


        /*
         * ====================================================
         * CODING PIPELINE
         * ====================================================
         */

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


        /*
         * ====================================================
         * RUNTIME STATE
         * ====================================================
         */

        this.initializedAt =
            Date.now();

        this.status =
            "ready";
    }


    /*
     * ========================================================
     * ERROR
     * ========================================================
     */

    async reportError(error) {

        return this.errorCenter.report(
            error
        );
    }


    /*
     * ========================================================
     * SKILLS
     * ========================================================
     */

    async createSkill(
        definition,
        actor
    ) {

        return this.skills.create(
            definition,
            actor
        );
    }


    /*
     * ========================================================
     * EXPERIMENTS
     * ========================================================
     */

    async createExperiment(
        input,
        actor
    ) {

        return this.experiments.create(
            input,
            actor
        );
    }


    /*
     * ========================================================
     * CHANGE PROPOSAL
     * ========================================================
     */

    async createChangeProposal(
        input,
        actor
    ) {

        return this.approval.createProposal(
            input,
            actor
        );
    }


    /*
     * ========================================================
     * RUNTIME STATUS
     * ========================================================
     */

    getStatus() {

        return {

            status:
                this.status,

            initializedAt:
                this.initializedAt,

            uptime:
                Date.now() -
                this.initializedAt,

            database:
                !!this.db,

            components: {

                risk:
                    !!this.riskEngine,

                audit:
                    !!this.audit,

                errorCenter:
                    !!this.errorCenter,

                approval:
                    !!this.approval,

                skills:
                    !!this.skills,

                experiments:
                    !!this.experiments,

                modification:
                    !!this.modification,

                testEngine:
                    !!this.testEngine,

                regressionEngine:
                    !!this.regressionEngine,

                codingLoop:
                    !!this.codingLoop,

                skillBuilder:
                    !!this.skillBuilder,

                codingAgent:
                    !!this.codingAgent,

                changeSet:
                    !!this.changeSet,

                diffEngine:
                    !!this.diffEngine,

                snapshotManager:
                    !!this.snapshotManager,

                versionManager:
                    !!this.versionManager,

                canaryManager:
                    !!this.canaryManager,

                rollbackManager:
                    !!this.rollbackManager,

                deploymentManager:
                    !!this.deploymentManager
            }
        };
    }


    /*
     * ========================================================
     * SHUTDOWN
     * ========================================================
     */

    async shutdown() {

        this.status =
            "stopped";

        const components = [

            this.deploymentManager,
            this.rollbackManager,
            this.canaryManager,
            this.versionManager,
            this.snapshotManager,
            this.diffEngine,
            this.codingPipeline,
            this.codingAgent,
            this.codingLoop,
            this.codeRepair,
            this.experiments,
            this.skillExecutor,
            this.skillSandbox
        ];

        for (
            const component of components
        ) {

            if (
                component &&
                typeof component.shutdown ===
                    "function"
            ) {

                try {

                    await component.shutdown();

                } catch (error) {

                    this.logger.error(
                        "[EvolutionRuntime] shutdown error:",
                        error
                    );
                }
            }
        }

        return {
            success:
                true,

            status:
                this.status
        };
    }
}


module.exports = {
    EvolutionRuntime
};
