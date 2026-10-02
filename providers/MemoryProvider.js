'use strict';

const BaseProvider =
  require('./BaseProvider');

class MemoryProvider
  extends BaseProvider {

  constructor(options = {}) {
    super({
      ...options,
      name:
        options.name ||
        'astra-memory-provider'
    });

    this.memory =
      options.memory || null;
  }

  setMemory(memory) {
    this.memory = memory;
    return true;
  }

  getMemory() {
    return this.memory;
  }

  async retrieve(
    query,
    context = {}
  ) {
    this.assertEnabled();

    if (!this.memory) {
      return [];
    }

    if (
      typeof this.memory.retrieve ===
      'function'
    ) {
      return await this.memory.retrieve(
        query,
        context
      );
    }

    if (
      typeof this.memory.search ===
      'function'
    ) {
      return await this.memory.search(
        query,
        context
      );
    }

    return [];
  }

  async remember(
    memory,
    context = {}
  ) {
    this.assertEnabled();

    if (!this.memory) {
      return {
        success: false,
        error: 'MEMORY_NOT_CONNECTED'
      };
    }

    if (
      typeof this.memory.remember ===
      'function'
    ) {
      return await this.memory.remember(
        memory,
        context
      );
    }

    if (
      typeof this.memory.store ===
      'function'
    ) {
      return await this.memory.store(
        memory,
        context
      );
    }

    return {
      success: false,
      error: 'MEMORY_WRITE_UNSUPPORTED'
    };
  }

  async forget(
    query,
    context = {}
  ) {
    this.assertEnabled();

    if (!this.memory) {
      return {
        success: false,
        error: 'MEMORY_NOT_CONNECTED'
      };
    }

    if (
      typeof this.memory.forget ===
      'function'
    ) {
      return await this.memory.forget(
        query,
        context
      );
    }

    return {
      success: false,
      error: 'MEMORY_FORGET_UNSUPPORTED'
    };
  }
}

module.exports =
  MemoryProvider;
