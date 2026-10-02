'use strict';

const BaseProvider =
  require('./BaseProvider');

class ToolProvider
  extends BaseProvider {

  constructor(options = {}) {
    super({
      ...options,
      name:
        options.name ||
        'astra-tool-provider'
    });

    this.router =
      options.router || null;
  }

  setRouter(router) {
    this.router = router;
    return true;
  }

  getRouter() {
    return this.router;
  }

  list() {
    this.assertEnabled();

    if (!this.router) {
      return [];
    }

    if (
      typeof this.router.list ===
      'function'
    ) {
      return this.router.list();
    }

    if (
      typeof this.router.getCapabilities ===
      'function'
    ) {
      return this.router.getCapabilities();
    }

    return [];
  }

  has(name) {
    this.assertEnabled();

    if (!this.router) {
      return false;
    }

    if (
      typeof this.router.has ===
      'function'
    ) {
      return this.router.has(name);
    }

    if (
      typeof this.router.get ===
      'function'
    ) {
      return !!this.router.get(name);
    }

    return false;
  }

  async execute(
    name,
    payload = {},
    context = {}
  ) {
    this.assertEnabled();

    if (!this.router) {
      return {
        success: false,
        error: 'TOOL_ROUTER_NOT_CONNECTED'
      };
    }

    if (
      typeof this.router.execute !==
      'function'
    ) {
      return {
        success: false,
        error: 'TOOL_ROUTER_EXECUTION_UNSUPPORTED'
      };
    }

    return await this.router.execute(
      name,
      payload,
      context
    );
  }
}

module.exports =
  ToolProvider;
