'use strict';

/**
 * MiniCapabilityRegistry
 *
 * Registry riêng cho Mini Agent.
 *
 * Mục tiêu:
 * - Không cho Mini Agent tự động truy cập toàn bộ capabilities.
 * - Chỉ đăng ký những capability được phép.
 * - Không cấp quyền Core modification / security modification.
 * - Không chứa API key hoặc secret.
 */

class MiniCapabilityRegistry {
  constructor(options = {}) {
    this.capabilities = new Map();

    this.allowedRiskLevels =
      options.allowedRiskLevels || [
        'LOW',
        'MEDIUM'
      ];

    this.blockedPermissions =
      new Set(
        options.blockedPermissions || [
          'core.modify',
          'security.modify',
          'security.manage',
          'permission.modify',
          'auth.modify',
          'secret.read',
          'secret.write',
          'sandbox.modify',
          'deployment.global',
          'production.modify',
          'system.modify'
        ]
      );
  }

  register(capability, definition = null) {
    let item;

    if (
      capability &&
      typeof capability === 'object' &&
      definition === null
    ) {
      item = {
        ...capability
      };
    } else {
      item = {
        ...(definition || {}),
        name: capability
      };
    }

    if (!item.name) {
      throw new Error(
        'MiniCapabilityRegistry: capability name is required'
      );
    }

    if (
      typeof item.execute !== 'function'
    ) {
      throw new Error(
        `MiniCapabilityRegistry: execute() is required for "${item.name}"`
      );
    }

    const name =
      String(item.name);

    const permissions =
      Array.isArray(item.permissions)
        ? item.permissions
        : [];

    const blocked =
      permissions.some(
        permission =>
          this.blockedPermissions.has(
            String(permission)
          )
      );

    if (blocked) {
      throw new Error(
        `MiniCapabilityRegistry: blocked permission in "${name}"`
      );
    }

    const riskLevel =
      String(
        item.riskLevel || 'LOW'
      ).toUpperCase();

    if (
      !this.allowedRiskLevels.includes(
        riskLevel
      )
    ) {
      throw new Error(
        `MiniCapabilityRegistry: risk level "${riskLevel}" is not allowed for "${name}"`
      );
    }

    const normalized = {
      ...item,

      name,

      enabled:
        item.enabled !== false,

      available:
        item.available !== false,

      riskLevel
    };

    this.capabilities.set(
      name,
      normalized
    );

    return normalized;
  }

  unregister(name) {
    return this.capabilities.delete(
      String(name)
    );
  }

  has(name) {
    return this.capabilities.has(
      String(name)
    );
  }

  get(name) {
    return (
      this.capabilities.get(
        String(name)
      ) || null
    );
  }

  list() {
    return Array.from(
      this.capabilities.values()
    );
  }

  names() {
    return Array.from(
      this.capabilities.keys()
    );
  }

  clear() {
    this.capabilities.clear();
  }
}

module.exports =
  MiniCapabilityRegistry;
