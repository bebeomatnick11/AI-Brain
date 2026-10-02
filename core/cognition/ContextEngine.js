'use strict';

class ContextEngine {
  constructor(options = {}) {
    this.maxHistory =
      Number(
        options.maxHistory || 12
      );

    this.history = [];
  }

  build(input = {}) {
    const {
      message,
      understanding,
      memories = [],
      world = null,
      self = null
    } = input;

    const context = {
      message:
        String(message || ''),

      intent:
        understanding?.intent || {
          type: 'chat',
          score: 0
        },

      language:
        understanding?.language ||
        'unknown',

      keywords:
        understanding?.keywords || [],

      question:
        understanding?.question || {
          isQuestion: false
        },

      memories,
      world,
      self,

      history:
        this.history.slice(
          -this.maxHistory
        ),

      timestamp: Date.now()
    };

    this.history.push({
      message: context.message,
      intent: context.intent,
      timestamp:
        context.timestamp
    });

    if (
      this.history.length >
      this.maxHistory
    ) {
      this.history =
        this.history.slice(
          -this.maxHistory
        );
    }

    return context;
  }

  recent(limit = 6) {
    return this.history
      .slice(-limit);
  }

  clear() {
    this.history = [];
  }
}

module.exports =
  ContextEngine;
