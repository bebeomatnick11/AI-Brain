'use strict';

const APPROVAL_RULES = {
  LOW: {
    requiredRoles: [
      'Developer',
      'Admin',
      'Owner'
    ],

    requiredApprovals: 1
  },

  MEDIUM: {
    requiredRoles: [
      'Developer',
      'Admin',
      'Owner'
    ],

    requiredApprovals: 1
  },

  HIGH: {
    requiredRoles: [
      'Admin',
      'Owner'
    ],

    requiredApprovals: 1
  },

  CRITICAL: {
    requiredRoles: [
      'Owner'
    ],

    requiredApprovals: 1
  }
};

class ApprovalPolicy {
  constructor(options = {}) {
    this.rules =
      options.rules ||
      APPROVAL_RULES;
  }

  getRule(risk) {
    return (
      this.rules[risk] ||
      this.rules.CRITICAL
    );
  }

  canApprove(
    actor,
    risk
  ) {
    const rule =
      this.getRule(risk);

    if (!actor) {
      return false;
    }

    return rule.requiredRoles.includes(
      actor.role
    );
  }

  evaluate(
    risk,
    approvals = []
  ) {
    const rule =
      this.getRule(risk);

    const validApprovals =
      approvals.filter(
        approval =>
          approval &&
          approval.approved === true &&
          rule.requiredRoles.includes(
            approval.role
          )
      );

    const uniqueActors =
      new Set(
        validApprovals.map(
          approval =>
            approval.actorId
        )
      );

    const count =
      uniqueActors.size;

    return {
      approved:
        count >=
        rule.requiredApprovals,

      count,

      required:
        rule.requiredApprovals,

      requiredRoles:
        rule.requiredRoles
    };
  }
}

module.exports =
  ApprovalPolicy;
