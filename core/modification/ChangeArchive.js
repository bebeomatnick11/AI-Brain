'use strict';

const crypto = require('crypto');

class ChangeArchive {
  constructor() {
    this.archive = [];
  }

  archive(change = {}, reason = '') {
    const record = {
      id:
        `archived-change-${crypto.randomUUID()}`,

      originalChangeId:
        change.id || null,

      status: 'REJECTED',

      reason,

      change: JSON.parse(
        JSON.stringify(change)
      ),

      archivedAt:
        new Date().toISOString()
    };

    this.archive.push(record);

    return record;
  }

  list(filters = {}) {
    let result = [...this.archive];

    if (filters.reason) {
      result = result.filter(
        item =>
          item.reason === filters.reason
      );
    }

    return result.reverse();
  }

  get(id) {
    return (
      this.archive.find(
        item => item.id === id
      ) || null
    );
  }
}

module.exports = ChangeArchive;
