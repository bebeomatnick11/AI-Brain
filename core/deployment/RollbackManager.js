'use strict';

class RollbackManager {
  constructor(options = {}) {
    this.versionManager =
      options.versionManager;

    this.snapshotManager =
      options.snapshotManager;

    this.deployments = [];
  }

  rollback(input = {}) {
    if (!input.targetVersionId) {
      throw new Error(
        'targetVersionId required'
      );
    }

    const target =
      this.versionManager.get(
        input.targetVersionId
      );

    if (!target) {
      throw new Error(
        'Target version not found'
      );
    }

    const record = {
      id:
        `rollback-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

      targetVersionId:
        target.id,

      previousVersionId:
        input.previousVersionId || null,

      snapshotId:
        target.snapshotId || null,

      reason:
        input.reason ||
        'Manual rollback',

      actorId:
        input.actorId || null,

      createdAt:
        new Date().toISOString()
    };

    this.deployments.push(record);

    return record;
  }
}

module.exports = RollbackManager;
