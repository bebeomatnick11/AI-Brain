'use strict';

const crypto = require('crypto');

class ExperimentHistory {
  constructor(options = {}) {
    this.records = [];
    this.maxRecords =
      options.maxRecords || 10000;
  }

  add(type, data = {}) {
    const record = {
      id:
        `exp-history-${crypto.randomUUID()}`,

      type,

      timestamp:
        new Date().toISOString(),

      ...data
    };

    this.records.push(record);

    if (
      this.records.length >
      this.maxRecords
    ) {
      this.records.shift();
    }

    return record;
  }

  get(id) {
    return (
      this.records.find(
        item => item.id === id
      ) || null
    );
  }

  list(filters = {}) {
    let result = [...this.records];

    if (filters.experimentId) {
      result = result.filter(
        item =>
          item.experimentId ===
          filters.experimentId
      );
    }

    if (filters.workspaceId) {
      result = result.filter(
        item =>
          item.workspaceId ===
          filters.workspaceId
      );
    }

    if (filters.type) {
      result = result.filter(
        item =>
          item.type === filters.type
      );
    }

    if (filters.status) {
      result = result.filter(
        item =>
          item.status === filters.status
      );
    }

    return result.reverse();
  }

  experiments() {
    return this.list({
      type: 'EXPERIMENT'
    });
  }

  changes() {
    return this.list({
      type: 'CHANGE'
    });
  }

  tests() {
    return this.list({
      type: 'TEST'
    });
  }

  rejected() {
    return this.list({
      type: 'REJECTED_CHANGE'
    });
  }
}

module.exports = ExperimentHistory;
