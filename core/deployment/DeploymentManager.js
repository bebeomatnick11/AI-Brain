'use strict';

class DeploymentManager {
  constructor(options = {}) {
    this.versionManager =
      options.versionManager;

    this.snapshotManager =
      options.snapshotManager;

    this.canaryManager =
      options.canaryManager;

    this.rollbackManager =
      options.rollbackManager;

    this.deployments = new Map();
  }

  createDeployment(input = {}) {
    const version =
      this.versionManager.get(
        input.versionId
      );

    if (!version) {
      throw new Error(
        'Version not found'
      );
    }

    if (
      version.status !==
      'APPROVED'
    ) {
      throw new Error(
        'Only APPROVED versions can deploy'
      );
    }

    const snapshot =
      this.snapshotManager.create({
        versionId:
          version.id,

        source:
          'PRE_DEPLOY',

        files:
          input.files || {},

        metadata:
          input.metadata || {}
      });

    const deployment = {
      id:
        `deployment-${Date.now()}`,

      versionId:
        version.id,

      snapshotId:
        snapshot.id,

      stage:
        'DRAFT',

      status:
        'READY',

      createdAt:
        new Date().toISOString()
    };

    this.deployments.set(
      deployment.id,
      deployment
    );

    return deployment;
  }

  startCanary(
    deploymentId,
    options = {}
  ) {
    const deployment =
      this.get(deploymentId);

    if (
      deployment.stage !==
      'DRAFT'
    ) {
      throw new Error(
        'Deployment is not in DRAFT stage'
      );
    }

    const canary =
      this.canaryManager.start({
        versionId:
          deployment.versionId,

        traffic:
          options.traffic,

        duration:
          options.duration
      });

    deployment.stage =
      'CANARY';

    deployment.status =
      'CANARY_RUNNING';

    deployment.canaryId =
      canary.id;

    return deployment;
  }

  evaluateCanary(
    deploymentId,
    policy
  ) {
    const deployment =
      this.get(deploymentId);

    if (
      deployment.stage !==
      'CANARY'
    ) {
      throw new Error(
        'Deployment is not in CANARY'
      );
    }

    return this.canaryManager.evaluate(
      deployment.canaryId,
      policy
    );
  }

  promoteGlobal(
    deploymentId,
    actor = {}
  ) {
    const deployment =
      this.get(deploymentId);

    const canary =
      this.canaryManager.evaluate(
        deployment.canaryId
      );

    if (!canary.healthy) {
      throw new Error(
        'Canary health check failed'
      );
    }

    const allowedRoles = [
      'Owner',
      'Admin'
    ];

    if (
      !allowedRoles.includes(
        actor.role
      )
    ) {
      throw new Error(
        'Global deployment requires Owner or Admin'
      );
    }

    deployment.stage =
      'GLOBAL';

    deployment.status =
      'DEPLOYED';

    deployment.deployedBy =
      actor.userId || null;

    deployment.deployedAt =
      new Date().toISOString();

    return deployment;
  }

  rollback(
    deploymentId,
    targetVersionId,
    actor = {},
    reason
  ) {
    const deployment =
      this.get(deploymentId);

    const allowedRoles = [
      'Owner',
      'Admin'
    ];

    if (
      !allowedRoles.includes(
        actor.role
      )
    ) {
      throw new Error(
        'Rollback requires Owner or Admin'
      );
    }

    const result =
      this.rollbackManager.rollback({
        targetVersionId,

        previousVersionId:
          deployment.versionId,

        actorId:
          actor.userId,

        reason
      });

    deployment.stage =
      'ROLLED_BACK';

    deployment.status =
      'ROLLED_BACK';

    deployment.rollbackId =
      result.id;

    return result;
  }

  get(id) {
    const deployment =
      this.deployments.get(id);

    if (!deployment) {
      throw new Error(
        'Deployment not found'
      );
    }

    return deployment;
  }

  list() {
    return [
      ...this.deployments.values()
    ].reverse();
  }
}

module.exports =
  DeploymentManager;
