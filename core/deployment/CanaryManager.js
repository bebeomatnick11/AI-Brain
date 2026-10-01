'use strict';

class CanaryManager {
  constructor(options = {}) {
    this.deployments = new Map();

    this.defaultDuration =
      options.duration || 60_000;

    this.defaultTraffic =
      options.traffic || 5;
  }

  start(input = {}) {
    if (!input.versionId) {
      throw new Error(
        'versionId required'
      );
    }

    const id =
      `canary-${input.versionId}`;

    const deployment = {
      id,

      versionId:
        input.versionId,

      traffic:
        input.traffic ??
        this.defaultTraffic,

      duration:
        input.duration ??
        this.defaultDuration,

      status: 'RUNNING',

      metrics: {
        requests: 0,
        errors: 0,
        latencyMs: 0
      },

      startedAt:
        new Date().toISOString()
    };

    this.deployments.set(
      id,
      deployment
    );

    return deployment;
  }

  recordMetric(
    id,
    metric = {}
  ) {
    const deployment =
      this.deployments.get(id);

    if (!deployment) {
      throw new Error(
        'Canary not found'
      );
    }

    if (
      Number.isFinite(
        metric.requests
      )
    ) {
      deployment.metrics.requests +=
        metric.requests;
    }

    if (
      Number.isFinite(
        metric.errors
      )
    ) {
      deployment.metrics.errors +=
        metric.errors;
    }

    if (
      Number.isFinite(
        metric.latencyMs
      )
    ) {
      deployment.metrics.latencyMs =
        metric.latencyMs;
    }

    return deployment;
  }

  evaluate(id, policy = {}) {
    const deployment =
      this.deployments.get(id);

    if (!deployment) {
      throw new Error(
        'Canary not found'
      );
    }

    const maxErrorRate =
      policy.maxErrorRate ?? 0.05;

    const maxLatency =
      policy.maxLatencyMs ?? 5000;

    const requests =
      deployment.metrics.requests;

    const errors =
      deployment.metrics.errors;

    const errorRate =
      requests > 0
        ? errors / requests
        : 0;

    const healthy =
      errorRate <=
        maxErrorRate &&
      deployment.metrics.latencyMs <=
        maxLatency;

    deployment.status =
      healthy
        ? 'HEALTHY'
        : 'UNHEALTHY';

    return {
      healthy,
      errorRate,
      latencyMs:
        deployment.metrics.latencyMs,
      status:
        deployment.status
    };
  }
}

module.exports = CanaryManager;
