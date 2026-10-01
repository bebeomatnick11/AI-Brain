'use strict';

const crypto = require('crypto');

class SecurityAudit {
  constructor(options = {}) {
    this.events = [];

    this.maxEvents =
      options.maxEvents || 20000;

    this.redactor =
      options.redactor || null;
  }

  record(event = {}) {
    let payload = {
      ...event
    };

    if (this.redactor) {
      payload =
        this.redactor.redact(
          payload
        );
    }

    const record = {
      id:
        `audit-${crypto.randomUUID()}`,

      timestamp:
        new Date().toISOString(),

      ...payload
    };

    this.events.push(record);

    if (
      this.events.length >
      this.maxEvents
    ) {
      this.events.shift();
    }

    return record;
  }

  list(filters = {}) {
    let result =
      [...this.events];

    if (filters.actorId) {
      result =
        result.filter(
          event =>
            event.actorId ===
            filters.actorId
        );
    }

    if (filters.action) {
      result =
        result.filter(
          event =>
            event.action ===
            filters.action
        );
    }

    if (filters.risk) {
      result =
        result.filter(
          event =>
            event.risk ===
            filters.risk
        );
    }

    return result.reverse();
  }
}

module.exports =
  SecurityAudit;
