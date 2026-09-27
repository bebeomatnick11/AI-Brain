class MiniMemory {
  constructor(options = {}) {
    this.memory =
      options.memory || null;
  }

  async recall(query, options = {}) {
    if (!this.memory) {
      return [];
    }

    try {
      if (
        typeof this.memory.search ===
        "function"
      ) {
        return await this.memory.search(
          query,
          options
        );
      }

      if (
        typeof this.memory.retrieve ===
        "function"
      ) {
        return await this.memory.retrieve(
          query,
          options
        );
      }
    } catch (_) {}

    return [];
  }

  async remember(data) {
    if (!this.memory) {
      return false;
    }

    try {
      if (
        typeof this.memory.add ===
        "function"
      ) {
        await this.memory.add(data);
        return true;
      }

      if (
        typeof this.memory.remember ===
        "function"
      ) {
        await this.memory.remember(data);
        return true;
      }
    } catch (_) {}

    return false;
  }
}

module.exports = MiniMemory;
