'use strict';

function createTrace(input = {}) {
  return {
    id:
      `trace-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    startedAt:
      new Date().toISOString(),

    status:
      'running',

    input:
      String(input.text || '')
        .slice(0, 2000),

    intent:
      null,

    route:
      null,

    events:
      [],

    result:
      null,

    error:
      null,

    finishedAt:
      null
  };
}

function addEvent(
  trace,
  type,
  data = {}
) {
  trace.events.push({
    type,

    timestamp:
      new Date().toISOString(),

    data
  });

  return trace;
}

function finishTrace(
  trace,
  result = null
) {
  trace.status =
    'completed';

  trace.result =
    result;

  trace.finishedAt =
    new Date().toISOString();

  return trace;
}

function failTrace(
  trace,
  error
) {
  trace.status =
    'failed';

  trace.error =
    String(
      error?.message ||
      error
    );

  trace.finishedAt =
    new Date().toISOString();

  return trace;
}

module.exports = {
  createTrace,
  addEvent,
  finishTrace,
  failTrace
};
