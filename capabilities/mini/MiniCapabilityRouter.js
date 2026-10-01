'use strict';

/**
 * MiniCapabilityRouter
 *
 * Router dành riêng cho Mini Agent.
 *
 * Không tự tìm capability ngoài MiniCapabilityRegistry.
 * Không bypass permission.
 * Không thực thi capability bị disabled/unavailable.
 */

class MiniCapabilityRouter {
  constructor(
    registry,
    options = {}
  ) {
    if (!registry) {
      throw new Error(
        'MiniCapabilityRouter: registry is required'
      );
    }

    this.registry =
      registry;

    this.defaultTimeout =
      Number(
        options.defaultTimeout || 15000
      );

    this.maxTimeout =
      Number(
        options.maxTimeout || 30000
      );
  }

  list() {
    return this.registry.list();
  }

  has(name) {
    return this.registry.has(name);
  }

  get(name) {
    return this.registry.get(name);
  }

  async execute(
    name,
    payload = {},
    context = {}
  ) {
    const capability =
      this.registry.get(name);

    if (!capability) {
      return {
        success: false,

        error:
          'MINI_CAPABILITY_NOT_FOUND',

        capability:
          String(name)
      };
    }

    if (
      capability.enabled === false
    ) {
      return {
        success: false,

        error:
          'MINI_CAPABILITY_DISABLED',

        capability:
          String(name)
      };
    }

    if (
      capability.available === false
    ) {
      return {
        success: false,

        error:
          'MINI_CAPABILITY_UNAVAILABLE',

        capability:
          String(name)
      };
    }

    const requestedTimeout =
      Number(
        context.timeoutMs ||
        capability.timeoutMs ||
        this.defaultTimeout
      );

    const timeout =
      Math.min(
        Math.max(
          requestedTimeout,
          1
        ),
        this.maxTimeout
      );

    try {
      const result =
        await this.withTimeout(
          Promise.resolve(
            capability.execute(
              payload,
              context
            )
          ),
          timeout
        );

      return {
        success: true,

        capability:
          capability.name,

        result
      };

    } catch (error) {
      return {
        success: false,

        capability:
          capability.name,

        error:
          error?.message ||
          String(error),

        code:
          error?.code ||
          'MINI_CAPABILITY_EXECUTION_ERROR'
      };
    }
  }

  async withTimeout(
    promise,
    timeoutMs
  ) {
    let timer;

    try {
      return await Promise.race([
        promise,

        new Promise(
          (_, reject) => {
            timer =
              setTimeout(() => {

                const error =
                  new Error(
                    'Mini capability timeout'
                  );

                error.code =
                  'MINI_CAPABILITY_TIMEOUT';

                reject(error);

              }, timeoutMs);
          }
        )
      ]);

    } finally {

      if (timer) {
        clearTimeout(timer);
      }

    }
  }
}

module.exports =
  MiniCapabilityRouter;
