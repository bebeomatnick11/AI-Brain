class MiniState {
  constructor(options = {}) {
    this.id =
      options.id ||
      `mini-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    this.userId = options.userId || null;
    this.sessionId = options.sessionId || null;

    this.goal = options.goal || "";

    this.status = "created";

    this.step = 0;
    this.maxSteps = options.maxSteps || 6;

    this.plan = [];

    this.currentAction = null;

    this.history = [];

    this.results = [];

    this.errors = [];

    this.retries = 0;

    this.startedAt = Date.now();
    this.updatedAt = Date.now();

    this.finishedAt = null;
  }

  addHistory(entry) {
    this.history.push({
      ...entry,
      timestamp: Date.now()
    });

    this.updatedAt = Date.now();
  }

  addResult(result) {
    this.results.push(result);
    this.updatedAt = Date.now();
  }

  addError(error) {
    this.errors.push({
      message:
        error?.message ||
        String(error),

      timestamp: Date.now()
    });

    this.updatedAt = Date.now();
  }

  finish(status = "completed") {
    this.status = status;
    this.finishedAt = Date.now();
    this.updatedAt = Date.now();
  }

  isFinished() {
    return [
      "completed",
      "failed",
      "cancelled",
      "timeout"
    ].includes(this.status);
  }

  canContinue() {
    return (
      !this.isFinished() &&
      this.step < this.maxSteps
    );
  }

  nextStep() {
    this.step++;
    this.updatedAt = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      goal: this.goal,
      status: this.status,
      step: this.step,
      maxSteps: this.maxSteps,
      plan: this.plan,
      currentAction: this.currentAction,
      history: this.history,
      results: this.results,
      errors: this.errors,
      retries: this.retries,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      finishedAt: this.finishedAt
    };
  }
}

module.exports = MiniState;
