'use strict';

const crypto = require('crypto');

class ChangeSet {
  constructor(input = {}) {
    this.id =
      input.id ||
      `change-${crypto.randomUUID()}`;

    this.experimentId =
      input.experimentId || null;

    this.workspaceId =
      input.workspaceId || null;

    this.title =
      input.title || 'Untitled Change';

    this.description =
      input.description || '';

    this.reason =
      input.reason || '';

    this.authorId =
      input.authorId || null;

    this.agentId =
      input.agentId || null;

    this.files =
      Array.isArray(input.files)
        ? input.files
        : [];

    this.dependencies =
      Array.isArray(input.dependencies)
        ? input.dependencies
        : [];

    this.tests =
      Array.isArray(input.tests)
        ? input.tests
        : [];

    this.risk =
      input.risk || 'LOW';

    this.status =
      input.status || 'DRAFT';

    this.approval = null;

    this.createdAt =
      input.createdAt ||
      new Date().toISOString();

    this.updatedAt =
      new Date().toISOString();
  }

  addFile(change) {
    if (!change || !change.path) {
      throw new Error(
        'Change requires file path'
      );
    }

    this.files.push({
      path: change.path,
      action:
        change.action || 'MODIFY',
      oldContent:
        change.oldContent ?? null,
      newContent:
        change.newContent ?? null,
      diff:
        change.diff || null
    });

    this.touch();

    return this;
  }

  addDependency(dependency) {
    if (!dependency) return this;

    this.dependencies.push(
      dependency
    );

    this.touch();

    return this;
  }

  addTest(test) {
    if (!test) return this;

    this.tests.push(test);

    this.touch();

    return this;
  }

  setRisk(risk) {
    this.risk = risk;
    this.touch();

    return this;
  }

  setStatus(status) {
    this.status = status;
    this.touch();

    return this;
  }

  approve(actor = {}) {
    this.approval = {
      approved: true,
      actorId:
        actor.userId || null,
      role:
        actor.role || null,
      timestamp:
        new Date().toISOString()
    };

    this.status = 'APPROVED';

    this.touch();

    return this;
  }

  reject(actor = {}, reason = '') {
    this.approval = {
      approved: false,
      actorId:
        actor.userId || null,
      role:
        actor.role || null,
      reason,
      timestamp:
        new Date().toISOString()
    };

    this.status = 'REJECTED';

    this.touch();

    return this;
  }

  touch() {
    this.updatedAt =
      new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      experimentId:
        this.experimentId,
      workspaceId:
        this.workspaceId,
      title: this.title,
      description:
        this.description,
      reason: this.reason,
      authorId:
        this.authorId,
      agentId:
        this.agentId,
      files: this.files,
      dependencies:
        this.dependencies,
      tests: this.tests,
      risk: this.risk,
      status: this.status,
      approval: this.approval,
      createdAt:
        this.createdAt,
      updatedAt:
        this.updatedAt
    };
  }
}

module.exports = ChangeSet;
