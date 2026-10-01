'use strict';

const ROLE_PERMISSIONS = {
  Owner: [
    '*'
  ],

  Admin: [
    'experiment.create',
    'experiment.edit',
    'experiment.run',
    'experiment.test',

    'change.create',
    'change.review',
    'change.approve',

    'version.create',
    'version.rollback',

    'deployment.create',
    'deployment.canary',
    'deployment.global',
    'deployment.rollback',

    'security.view',
    'security.review',

    'member.manage',
    'skill.manage'
  ],

  Developer: [
    'experiment.create',
    'experiment.edit',
    'experiment.run',
    'experiment.test',

    'change.create',
    'change.review',
    'change.approve',

    'version.create',

    'deployment.create',
    'deployment.canary',

    'security.view',

    'skill.manage'
  ],

  Collaborator: [
    'experiment.create',
    'experiment.edit',
    'experiment.run',
    'experiment.test',

    'change.create',
    'change.review',

    'security.view'
  ],

  Tester: [
    'experiment.run',
    'experiment.test',

    'change.review',

    'security.view'
  ],

  User: [
    'experiment.create',
    'experiment.run'
  ],

  Viewer: [
    'security.view'
  ]
};

class PermissionEngine {
  constructor(options = {}) {
    this.roles =
      options.roles ||
      ROLE_PERMISSIONS;
  }

  getPermissions(role) {
    return [
      ...(this.roles[role] || [])
    ];
  }

  hasPermission(
    actor = {},
    permission
  ) {
    if (!actor.role) {
      return false;
    }

    const permissions =
      this.getPermissions(
        actor.role
      );

    return (
      permissions.includes('*') ||
      permissions.includes(permission)
    );
  }

  require(
    actor,
    permission
  ) {
    if (
      !this.hasPermission(
        actor,
        permission
      )
    ) {
      throw new Error(
        `Permission denied: ${permission}`
      );
    }

    return true;
  }

  can(
    actor,
    permission
  ) {
    return this.hasPermission(
      actor,
      permission
    );
  }
}

module.exports =
  PermissionEngine;
