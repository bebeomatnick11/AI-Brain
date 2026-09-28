"use strict";

const {
    ChangeWorkspace
} = require("./ChangeWorkspace");

const {
    SnapshotManager
} = require("./SnapshotManager");

const {
    DiffEngine
} = require("./DiffEngine");

const {
    VerificationController
} = require("./VerificationController");

const {
    DeploymentGate
} = require("./DeploymentGate");

const {
    RollbackManager
} = require("./RollbackManager");

class ModificationEngine {

    constructor(options = {}) {

        this.db =
            options.db || null;

        this.audit =
            options.audit || null;

        this.workspace =
            options.workspace ||
            new ChangeWorkspace({
                db: this.db,
                audit: this.audit
            });

        this.snapshots =
            options.snapshots ||
            new SnapshotManager({
                db: this.db,
                audit: this.audit
            });

        this.diff =
            options.diff ||
            new DiffEngine();

        this.verifier =
            options.verifier ||
            new VerificationController({
                audit: this.audit,
                testRunner:
                    options.testRunner,
                regressionRunner:
                    options.regressionRunner
            });

        this.deployment =
            options.deployment ||
            new DeploymentGate({
                audit: this.audit
            });

        this.rollback =
            options.rollback ||
            new RollbackManager({
                audit: this.audit,
                versionManager:
                    options.versionManager
            });
    }

    async createWorkspace(
        input,
        actor
    ) {

        return this.workspace.create(
            input,
            actor
        );
    }

    async snapshot(
        workspace,
        actor,
        reason
    ) {

        return this.snapshots
            .createSnapshot(
                {
                    brainId:
                        workspace.brainId,

                    workspaceId:
                        workspace.id,

                    files:
                        workspace.files,

                    reason
                },
                actor
            );
    }

    getDiff(
        workspace
    ) {

        return this.diff.compare(
            workspace.originalFiles,
            workspace.files
        );
    }

    async verify(
        workspace,
        requirements,
        actor
    ) {

        const result =
            await this.verifier.verify(
                workspace,
                requirements,
                actor
            );

        workspace.verification =
            result;

        return result;
    }

    async prepareChange(
        input,
        actor
    ) {

        const workspace =
            await this.createWorkspace(
                input,
                actor
            );

        const snapshot =
            await this.snapshot(
                workspace,
                actor,
                "before controlled modification"
            );

        return {

            workspace,

            snapshot,

            diff:
                this.getDiff(
                    workspace
                ),

            status:
                "READY_FOR_MODIFICATION"
        };
    }

    async verifyForApproval(
        workspace,
        requirements,
        actor
    ) {

        const verification =
            await this.verify(
                workspace,
                requirements,
                actor
            );

        const diff =
            this.getDiff(
                workspace
            );

        return {

            verification,

            diff,

            readyForApproval:
                verification.status ===
                "PASSED",

            status:
                verification.status ===
                "PASSED"
                    ? "READY_FOR_APPROVAL"
                    : "VERIFICATION_FAILED"
        };
    }

    async deploy(
        proposal,
        workspace,
        target,
        actor
    ) {

        return this.deployment.deploy(
            proposal,
            workspace.verification,
            target,
            actor
        );
    }

    async rollback(
        input,
        actor
    ) {

        return this.rollback.rollback(
            input,
            actor
        );
    }
}

module.exports = {
    ModificationEngine
};
