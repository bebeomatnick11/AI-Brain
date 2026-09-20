'use strict';

class CapabilityRegistry {

  constructor() {

    this.capabilities =
      new Map();
  }


  register(
    name,
    definition = {}
  ) {

    this.capabilities.set(
      name,
      {
        name,

        description:
          definition.description || '',

        enabled:
          definition.enabled !== false,

        available:
          definition.available !== false,

        backend:
          definition.backend || null,

        requiresAuth:
          definition.requiresAuth === true,

        execute:
          definition.execute || null,

        metadata:
          definition.metadata || {},

        updatedAt:
          Date.now()
      }
    );
  }


  get(
    name
  ) {

    return this.capabilities.get(
      name
    );
  }


  list() {

    return Array.from(
      this.capabilities.values()
    ).map(
      capability => ({
        ...capability,

        execute:
          undefined
      })
    );
  }


  has(
    name
  ) {

    const capability =
      this.get(name);


    return Boolean(
      capability &&
      capability.enabled &&
      capability.available
    );
  }


  async execute(
    name,
    payload,
    state
  ) {

    const capability =
      this.get(name);


    if (!capability) {

      throw new Error(
        `Unknown capability: ${name}`
      );
    }


    if (
      !capability.enabled
    ) {

      throw new Error(
        `Capability disabled: ${name}`
      );
    }


    if (
      !capability.available
    ) {

      throw new Error(
        `Capability unavailable: ${name}`
      );
    }


    if (
      typeof capability.execute !==
      'function'
    ) {

      throw new Error(
        `Capability has no executor: ${name}`
      );
    }


    return await capability.execute(
      payload,
      state
    );
  }
}


module.exports =
  CapabilityRegistry;
