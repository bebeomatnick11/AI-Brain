'use strict';

class ExperimentRunner {
  constructor(options = {}) {
    this.workspace =
      options.workspace;

    this.validator =
      options.validator || null;

    this.testEngine =
      options.testEngine || null;

    this.regressionEngine =
      options.regressionEngine || null;

    if (!this.workspace) {
      throw new Error(
        'ExperimentRunner requires workspace'
      );
    }
  }

  async run(experiment = {}) {
    const workspaceId =
      experiment.workspaceId;

    if (!workspaceId) {
      throw new Error(
        'workspaceId is required'
      );
    }

    const workspace =
      this.workspace.get(workspaceId);

    this.workspace.markStatus(
      workspaceId,
      'RUNNING'
    );

    const result = {
      experimentId:
        experiment.id || null,

      workspaceId,

      status: 'RUNNING',

      validation: null,

      tests: null,

      regression: null,

      error: null,

      startedAt:
        new Date().toISOString(),

      finishedAt: null
    };

    try {
      if (this.validator) {
        result.validation =
          await this.validator.validate(
            workspace
          );
      }

      if (
        result.validation &&
        result.validation.valid === false
      ) {
        result.status = 'FAILED';

        this.workspace.markStatus(
          workspaceId,
          'FAILED'
        );

        return this.finish(result);
      }

      if (this.testEngine) {
        result.tests =
          await this.testEngine.run({
            workspace,
            experiment
          });
      }

      if (
        result.tests &&
        result.tests.passed === false
      ) {
        result.status = 'FAILED';

        this.workspace.markStatus(
          workspaceId,
          'FAILED'
        );

        return this.finish(result);
      }

      if (this.regressionEngine) {
        result.regression =
          await this.regressionEngine.run({
            workspace,
            experiment
          });
      }

      result.status = 'PASSED';

      this.workspace.markStatus(
        workspaceId,
        'PASSED'
      );

      return this.finish(result);
    } catch (error) {
      result.status = 'ERROR';

      result.error = {
        name: error.name,
        message: error.message
      };

      this.workspace.markStatus(
        workspaceId,
        'ERROR'
      );

      return this.finish(result);
    }
  }

  finish(result) {
    result.finishedAt =
      new Date().toISOString();

    return result;
  }
}

module.exports = ExperimentRunner;
