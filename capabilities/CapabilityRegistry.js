'use strict';

class CapabilityRegistry {
  constructor() {
    this.capabilities = new Map();
  }

  register(capability, definition = null) {
    let item;

    // Support:
    // registry.register({
    //   name: 'mini_agent',
    //   ...
    // })
    if (
      capability &&
      typeof capability === 'object' &&
      !definition
    ) {
      item = {
        ...capability
      };
    }

    // Also support:
    // registry.register('mini_agent', {...})
    else {
      item = {
        ...(definition || {}),
        name: capability
      };
    }

    if (!item.name) {
      throw new Error(
        'CapabilityRegistry.register: capability name is required'
      );
    }

    if (typeof item.execute !== 'function') {
      throw new Error(
        `CapabilityRegistry.register: execute() is required for "${item.name}"`
      );
    }

    if (item.enabled === undefined) {
      item.enabled = true;
    }

    if (item.available === undefined) {
      item.available = true;
    }

    this.capabilities.set(
      String(item.name),
      item
    );

    return item;
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

  getAll() {
    return this.list();
  }

  getCapabilities() {
    return this.list();
  }

  names() {
    return Array.from(
      this.capabilities.keys()
    );
  }

  async execute(
    name,
    payload = {},
    context = {}
  ) {
    const capability =
      this.get(name);

    if (!capability) {
      throw new Error(
        `Capability not found: ${name}`
      );
    }

    if (capability.enabled === false) {
      throw new Error(
        `Capability disabled: ${name}`
      );
    }

    if (capability.available === false) {
      throw new Error(
        `Capability unavailable: ${name}`
      );
    }

    return await capability.execute(
      payload,
      context
    );
  }
}

module.exports =
  CapabilityRegistry;
