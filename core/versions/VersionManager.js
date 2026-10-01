'use strict';

const crypto = require('crypto');

class VersionManager {
  constructor() {
    this.versions = new Map();
  }

  create(input = {}) {
    const id =
      input.id ||
      `version-${crypto.randomUUID()}`;

    const version = {
      id,

      number:
        input.number ||
        this.nextNumber(),

      parentVersion:
        input.parentVersion || null,

      changeSetId:
        input.changeSetId || null,

      snapshotId:
        input.snapshotId || null,

      authorId:
        input.authorId || null,

      agentId:
        input.agentId || null,

      reason:
        input.reason || '',

      status:
        input.status || 'DRAFT',

      tests:
        input.tests || null,

      createdAt:
        new Date().toISOString()
    };

    this.versions.set(
      id,
      version
    );

    return version;
  }

  nextNumber() {
    return (
      this.versions.size + 1
    );
  }

  get(id) {
    return (
      this.versions.get(id) ||
      null
    );
  }

  list() {
    return [
      ...this.versions.values()
    ].reverse();
  }

  markStatus(id, status) {
    const version =
      this.get(id);

    if (!version) {
      throw new Error(
        'Version not found'
      );
    }

    version.status = status;

    return version;
  }

  createRollbackVersion(
    targetVersion,
    currentVersion,
    actorId
  ) {
    return this.create({
      parentVersion:
        currentVersion?.id || null,

      reason:
        `Rollback to ${targetVersion.id}`,

      authorId:
        actorId || null,

      status:
        'DRAFT'
    });
  }
}

module.exports = VersionManager;
