'use strict';

class WorkingMemory {
  constructor(options = {}) {
    this.maxItems =
      Number(options.maxItems || 32);

    this.items = [];
    this.sequence = 0;
  }

  add(item, metadata = {}) {
    const entry = {
      id:
        `wm-${++this.sequence}`,
      value: item,
      metadata,
      timestamp: Date.now(),
      importance:
        Number(
          metadata.importance || 0.5
        )
    };

    this.items.push(entry);

    this.prune();

    return entry;
  }

  getAll() {
    return [...this.items];
  }

  recent(limit = 10) {
    return this.items
      .slice(-Math.max(1, limit))
      .reverse();
  }

  search(query) {
    const text =
      String(query || '')
        .toLowerCase();

    return this.items
      .filter(item =>
        JSON.stringify(item.value)
          .toLowerCase()
          .includes(text)
      )
      .reverse();
  }

  update(id, value) {
    const item =
      this.items.find(
        x => x.id === id
      );

    if (!item) {
      return false;
    }

    item.value = value;
    item.timestamp = Date.now();

    return true;
  }

  remove(id) {
    const index =
      this.items.findIndex(
        x => x.id === id
      );

    if (index === -1) {
      return false;
    }

    this.items.splice(index, 1);

    return true;
  }

  clear() {
    this.items = [];
  }

  prune() {
    if (
      this.items.length <=
      this.maxItems
    ) {
      return;
    }

    this.items.sort(
      (a, b) =>
        (b.importance + b.timestamp / 1e15) -
        (a.importance + a.timestamp / 1e15)
    );

    this.items =
      this.items.slice(
        0,
        this.maxItems
      );
  }

  snapshot() {
    return {
      size: this.items.length,
      maxItems: this.maxItems,
      items: this.getAll()
    };
  }
}

module.exports =
  WorkingMemory;
