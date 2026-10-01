'use strict';

class SecurityGate {
  constructor(options = {}) {
    this.permissionEngine =
      options.permissionEngine;

    this.riskAnalyzer =
      options.riskAnalyzer;

    this.approvalPolicy =
      options.approvalPolicy;

    this.audit =
      options.audit;

    if (
      !this.permissionEngine ||
      !this.riskAnalyzer ||
      !this.approvalPolicy
    ) {
      throw new Error(
        'SecurityGate dependencies missing'
      );
    }
  }

  evaluate(
    actor,
    action,
    change = {}
  ) {
    const permission =
      this.permissionEngine.can(
        actor,
        action
      );

    const risk =
      this.riskAnalyzer.analyze(
        change
      );

    const result = {
      allowed: permission,

      permission,

      action,

      risk:
        risk.risk,

      riskScore:
        risk.score,

      reasons:
        risk.reasons,

      requiresApproval:
        risk.requiresApproval,

      requiresOwner:
        risk.requiresOwner,

      blockedAutomaticDeployment:
        risk.blockedFromAutomaticDeployment,

      timestamp:
        new Date().toISOString()
    };

    if (this.audit) {
      this.audit.record({
        action:
          'SECURITY_GATE_CHECK',

        actorId:
          actor?.userId || null,

        role:
          actor?.role || null,

        requestedAction:
          action,

        risk:
          risk.risk,

        allowed:
          result.allowed,

        reasons:
          risk.reasons
      });
    }

    return result;
  }

  authorize(
    actor,
    action,
    change = {},
    approvals = []
  ) {
    const evaluation =
      this.evaluate(
        actor,
        action,
        change
      );

    if (!evaluation.permission) {
      return {
        allowed: false,

        reason:
          'PERMISSION_DENIED',

        evaluation
      };
    }

    if (
      evaluation.risk ===
      'CRITICAL'
    ) {
      const approvalResult =
        this.approvalPolicy.evaluate(
          'CRITICAL',
          approvals
        );

      if (
        !approvalResult.approved
      ) {
        return {
          allowed: false,

          reason:
            'OWNER_APPROVAL_REQUIRED',

          evaluation,

          approval:
            approvalResult
        };
      }
    }

    if (
      evaluation.requiresApproval
    ) {
      const approvalResult =
        this.approvalPolicy.evaluate(
          evaluation.risk,
          approvals
        );

      if (
        !approvalResult.approved
      ) {
        return {
          allowed: false,

          reason:
            'APPROVAL_REQUIRED',

          evaluation,

          approval:
            approvalResult
        };
      }
    }

    if (
      evaluation.blockedAutomaticDeployment
    ) {
      return {
        allowed: false,

        reason:
          'CRITICAL_CHANGE_BLOCKED',

        evaluation
      };
    }

    if (this.audit) {
      this.audit.record({
        action:
          'SECURITY_GATE_AUTHORIZED',

        actorId:
          actor?.userId || null,

        role:
          actor?.role || null,

        requestedAction:
          action,

        risk:
          evaluation.risk
      });
    }

    return {
      allowed: true,

      evaluation
    };
  }
}

module.exports =
  SecurityGate;
