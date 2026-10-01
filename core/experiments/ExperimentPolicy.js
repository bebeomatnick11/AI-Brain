'use strict';

const CRITICAL_PATHS = [
  'authentication',
  'authorization',
  'permissions',
  'security',
  'secret',
  'sandbox',
  'approval',
  'core/runtime',
  'production'
];

const FORBIDDEN_CAPABILITIES = [
  'auth.modify',
  'permission.modify',
  'security.modify',
  'secret.read',
  'secret.write',
  'sandbox.modify',
  'production.modify',
  'deployment.global'
];

class ExperimentPolicy {
  constructor(options = {}) {
    this.requireApproval =
      options.requireApproval !== false;

    this.maxRisk =
      options.maxRisk || 'HIGH';
  }

  evaluateChange(change = {}) {
    const files =
      Array.isArray(change.files)
        ? change.files
        : [];

    const capabilities =
      Array.isArray(change.capabilities)
        ? change.capabilities
        : [];

    const reasons = [];

    let risk = 'LOW';

    for (const file of files) {
      const normalized =
        String(file)
          .toLowerCase()
          .replace(/\\/g, '/');

      if (
        CRITICAL_PATHS.some(
          path =>
            normalized.includes(path)
        )
      ) {
        risk = 'CRITICAL';

        reasons.push(
          `Critical path: ${file}`
        );
      }
    }

    for (const capability of capabilities) {
      if (
        FORBIDDEN_CAPABILITIES.includes(
          capability
        )
      ) {
        risk = 'CRITICAL';

        reasons.push(
          `Forbidden capability: ${capability}`
        );
      }
    }

    if (
      change.productionAccess === true
    ) {
      risk = 'CRITICAL';

      reasons.push(
        'Production access requested'
      );
    }

    const requiresApproval =
      this.requireApproval ||
      risk === 'HIGH' ||
      risk === 'CRITICAL';

    return {
      allowedInExperiment:
        risk !== 'CRITICAL',

      risk,

      requiresApproval,

      reasons
    };
  }

  canRunInExperiment(change = {}) {
    const result =
      this.evaluateChange(change);

    return result.allowedInExperiment;
  }

  canDeploy(change = {}) {
    const result =
      this.evaluateChange(change);

    return (
      result.risk !== 'CRITICAL' &&
      change.approved === true
    );
  }
}

module.exports = ExperimentPolicy;
