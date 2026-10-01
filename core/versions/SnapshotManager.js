'use strict';

const crypto = require('crypto');

class SnapshotManager {
  constructor(options = {}) {
    this.snapshots = new Map();

    this.maxSnapshots =
      options.maxSnapshots || 100;
  }

  create(input = {}) {
    if (!input.files) {
      throw new Error(
        'Snapshot requires files'
      );
    }

    const id =
      `snapshot-${crypto.randomUUID()}`;

    const snapshot = {
      id,

      versionId:
        input.versionId || null,

      source:
        input.source || 'UNKNOWN',

      files:
        JSON.parse(
          JSON.stringify(input.files)
        ),

      metadata:
        input.metadata || {},

      createdAt:
        new Date().toISOString()
    };

    this.snapshots.set(
      id,
      snapshot
    );

    while (
      this.snapshots.size >
      this.maxSnapshots
    ) {
      const oldest =
        this.snapshots.keys().next()
          .value;

      this.snapshots.delete(oldest);
    }

    return snapshot;
  }

  get(id) {
    return (
      this.snapshots.get(id) ||
      null
    );
  }

  list() {
    return [
      ...this.snapshots.values()
    ].reverse();
  }
}

module.exports = SnapshotManager;
