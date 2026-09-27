class MiniRetry {
  constructor(options = {}) {
    this.maxRetries =
      options.maxRetries ?? 2;

    this.baseDelay =
      options.baseDelay ?? 300;
  }

  shouldRetry(state) {
    return (
      state.retries <
      this.maxRetries
    );
  }

  async wait(retryCount) {
    const delay =
      this.baseDelay *
      Math.pow(2, retryCount);

    const jitter =
      Math.floor(
        Math.random() * 150
      );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          delay + jitter
        )
    );
  }

  next(state) {
    state.retries++;
  }
}

module.exports = MiniRetry;
