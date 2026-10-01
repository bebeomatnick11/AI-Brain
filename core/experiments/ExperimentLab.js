'use strict';

const crypto = require('crypto');

const ExperimentWorkspace =
  require('./ExperimentWorkspace');

const ExperimentHistory =
  require('./ExperimentHistory');

const ExperimentPolicy =
  require('./ExperimentPolicy');

const ExperimentRunner =
  require('./ExperimentRunner');

const ChangeArchive =
  require('../modification/ChangeArchive');

class ExperimentLab {
  constructor(options = {}) {
    this.workspace =
      options.workspace ||
      new ExperimentWorkspace();

    this.history =
      options.history ||
      new ExperimentHistory();

    this.policy =
      options.policy ||
      new ExperimentPolicy();

    this.archive =
      options.archive ||
      new ChangeArchive();

    this.runner =
      options.runner ||
      new ExperimentRunner({
        workspace:
          this.workspace,

        validator:
          options.validator,

        testEngine:
          options.testEngine,

        regressionEngine:
          options.regressionEngine
      });
  }

  createExperiment(input = {}) {
    const experiment = {
      id:
        `experiment-${crypto.randomUUID()}`,

      name:
        input.name ||
        'Untitled Experiment',

      description:
        input.description || '',

      ownerId:
        input.ownerId || null,

      status: 'DRAFT',

      createdAt:
        new Date().toISOString()
    };

    const workspace =
      this.workspace.create({
        experimentId:
          experiment.id,

        ownerId:
          experiment.ownerId,

        name:
          `${experiment.name} Workspace`,

        baseVersion:
          input.baseVersion || null
      });

    experiment.workspaceId =
      workspace.id;

    this.history.add(
      'EXPERIMENT',
      {
        experimentId:
          experiment.id,

        workspaceId:
          workspace.id,

        status: 'DRAFT',

        name:
          experiment.name
      }
    );

    return experiment;
  }

  writeFile(
    experimentId,
    filePath,
    content
  ) {
    const experiment =
      this.findExperiment(
        experimentId
      );

    if (!experiment) {
      throw new Error(
        'Experiment not found'
      );
    }

    const result =
      this.workspace.writeFile(
        experiment.workspaceId,
        filePath,
        content
      );

    this.history.add(
      'CHANGE',
      {
        experimentId,
        workspaceId:
          experiment.workspaceId,

        status: 'DRAFT',

        action: 'WRITE_FILE',

        file: filePath
      }
    );

    return result;
  }

  evaluateChange(
    experimentId,
    change = {}
  ) {
    const experiment =
      this.findExperiment(
        experimentId
      );

    if (!experiment) {
      throw new Error(
        'Experiment not found'
      );
    }

    const workspace =
      this.workspace.get(
        experiment.workspaceId
      );

    return this.policy.evaluateChange({
      ...change,

      files:
        change.files ||
        workspace.changedFiles &&
        [...workspace.changedFiles]
    });
  }

  async run(
    experimentId
  ) {
    const experiment =
      this.findExperiment(
        experimentId
      );

    if (!experiment) {
      throw new Error(
        'Experiment not found'
      );
    }

    experiment.status =
      'RUNNING';

    const result =
      await this.runner.run({
        id:
          experiment.id,

        workspaceId:
          experiment.workspaceId
      });

    experiment.status =
      result.status;

    this.history.add(
      'TEST',
      {
        experimentId,

        workspaceId:
          experiment.workspaceId,

        status:
          result.status,

        result
      }
    );

    return result;
  }

  approve(
    experimentId,
    actor = {}
  ) {
    const experiment =
      this.findExperiment(
        experimentId
      );

    if (!experiment) {
      throw new Error(
        'Experiment not found'
      );
    }

    const allowedRoles = [
      'Owner',
      'Admin',
      'Developer'
    ];

    if (
      !allowedRoles.includes(
        actor.role
      )
    ) {
      throw new Error(
        'Approval permission denied'
      );
    }

    experiment.status =
      'APPROVED';

    experiment.approvedBy =
      actor.userId || null;

    experiment.approvedAt =
      new Date().toISOString();

    this.history.add(
      'CHANGE',
      {
        experimentId,

        status: 'APPROVED',

        approvedBy:
          actor.userId || null
      }
    );

    return experiment;
  }

  reject(
    experimentId,
    actor = {},
    reason = 'Rejected'
  ) {
    const experiment =
      this.findExperiment(
        experimentId
      );

    if (!experiment) {
      throw new Error(
        'Experiment not found'
      );
    }

    const allowedRoles = [
      'Owner',
      'Admin',
      'Developer'
    ];

    if (
      !allowedRoles.includes(
        actor.role
      )
    ) {
      throw new Error(
        'Rejection permission denied'
      );
    }

    experiment.status =
      'REJECTED';

    const archived =
      this.archive.archive(
        experiment,
        reason
      );

    this.history.add(
      'REJECTED_CHANGE',
      {
        experimentId,

        status: 'REJECTED',

        reason,

        archiveId:
          archived.id
      }
    );

    return {
      experiment,
      archived
    };
  }

  rollback(experimentId) {
    const experiment =
      this.findExperiment(
        experimentId
      );

    if (!experiment) {
      throw new Error(
        'Experiment not found'
      );
    }

    const workspace =
      this.workspace.get(
        experiment.workspaceId
      );

    workspace.files.clear();
    workspace.changedFiles.clear();

    workspace.status =
      'ROLLED_BACK';

    workspace.updatedAt =
      new Date().toISOString();

    experiment.status =
      'ROLLED_BACK';

    this.history.add(
      'CHANGE',
      {
        experimentId,

        workspaceId:
          experiment.workspaceId,

        status: 'ROLLED_BACK'
      }
    );

    return {
      experimentId,

      workspaceId:
        experiment.workspaceId,

      status: 'ROLLED_BACK'
    };
  }

  getHistory(experimentId) {
    return this.history.list({
      experimentId
    });
  }

  getRejectedChanges() {
    return this.archive.list();
  }

  findExperiment(id) {
    const records =
      this.history.list();

    const record =
      records.find(
        item =>
          item.type === 'EXPERIMENT' &&
          item.experimentId === id
      );

    if (!record) {
      return null;
    }

    return {
      id,
      workspaceId:
        record.workspaceId,

      ownerId:
        record.ownerId || null,

      name:
        record.name,

      status:
        record.status
    };
  }
}

module.exports = ExperimentLab;
