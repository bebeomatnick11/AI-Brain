'use strict';

const CRITICAL_PATTERNS = [
  /auth/i,
  /authentication/i,
  /authorization/i,
  /permission/i,
  /security/i,
  /secret/i,
  /credential/i,
  /sandbox/i,
  /approval/i,
  /production/i,
  /deployment/i,
  /core\/runtime/i,
  /agentloop/i
];

const HIGH_PATTERNS = [
  /server\.js$/i,
  /package\.json$/i,
  /package-lock\.json$/i,
  /database/i,
  /migration/i,
  /capability/i,
  /router/i,
  /provider/i
];

class ChangeRiskAnalyzer {
  analyze(change = {}) {
    const files =
      Array.isArray(change.files)
        ? change.files
        : [];

    const capabilities =
      Array.isArray(change.capabilities)
        ? change.capabilities
        : [];

    const reasons = [];

    let score = 0;

    for (const file of files) {
      const path =
        String(
          file.path || file
        );

      if (
        CRITICAL_PATTERNS.some(
          pattern =>
            pattern.test(path)
        )
      ) {
        score += 100;

        reasons.push(
          `Critical file: ${path}`
        );

        continue;
      }

      if (
        HIGH_PATTERNS.some(
          pattern =>
            pattern.test(path)
        )
      ) {
        score += 40;

        reasons.push(
          `High-risk file: ${path}`
        );
      }
    }

    for (
      const capability
      of capabilities
    ) {
      const name =
        String(capability);

      if (
        [
          'auth.modify',
          'permission.modify',
          'security.modify',
          'secret.read',
          'secret.write',
          'sandbox.modify',
          'core.modify',
          'production.modify',
          'deployment.global'
        ].includes(name)
      ) {
        score += 100;

        reasons.push(
          `Critical capability: ${name}`
        );
      }
    }

    if (
      change.productionAccess === true
    ) {
      score += 100;

      reasons.push(
        'Production access requested'
      );
    }

    if (
      change.permissionChange === true
    ) {
      score += 100;

      reasons.push(
        'Permission change requested'
      );
    }

    if (
      change.secretAccess === true
    ) {
      score += 100;

      reasons.push(
        'Secret access requested'
      );
    }

    let risk = 'LOW';

    if (score >= 100) {
      risk = 'CRITICAL';
    } else if (score >= 50) {
      risk = 'HIGH';
    } else if (score >= 20) {
      risk = 'MEDIUM';
    }

    return {
      risk,
      score,
      reasons,
      requiresOwner:
        risk === 'CRITICAL',

      requiresApproval:
        risk !== 'LOW',

      blockedFromAutomaticDeployment:
        risk === 'CRITICAL'
    };
  }
}

module.exports =
  ChangeRiskAnalyzer;
