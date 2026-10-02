'use strict';

/**
 * BaseProvider
 *
 * Lớp nền cho các provider nội bộ của Astra.
 *
 * Provider ở đây không phải "AI model provider".
 * Nó là một lớp cung cấp dữ liệu/năng lực cho Astra Core.
 */

class BaseProvider {
  constructor(options = {}) {
    this.name =
      String(
        options.name ||
        this.constructor.name
      );

    this.version =
      String(
        options.version ||
        '1.0.0'
      );

    this.enabled =
      options.enabled !== false;

    this.metadata =
      options.metadata || {};
  }

  isEnabled() {
    return this.enabled === true;
  }

  enable() {
    this.enabled = true;
    return true;
  }

  disable() {
    this.enabled = false;
    return true;
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      enabled: this.enabled,
      metadata: this.metadata
    };
  }

  assertEnabled() {
    if (!this.enabled) {
      const error =
        new Error(
          `Provider "${this.name}" is disabled`
        );

      error.code =
        'PROVIDER_DISABLED';

      throw error;
    }
  }

  async initialize() {
    return true;
  }

  async shutdown() {
    return true;
  }
}

module.exports =
  BaseProvider;
