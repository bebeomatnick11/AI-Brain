class MiniVerifier {
  constructor(options = {}) {
    this.verificationTool =
      options.verificationTool || null;
  }

  async verify(context = {}) {
    const {
      goal,
      action,
      result
    } = context;

    if (
      result === undefined ||
      result === null
    ) {
      return {
        verified: false,
        score: 0,
        reason: "empty_result"
      };
    }

    if (
      result.success === false
    ) {
      return {
        verified: false,
        score: 0,
        reason:
          result.reason ||
          "tool_failed"
      };
    }

    if (
      this.verificationTool
    ) {
      try {
        const verified =
          await this.verificationTool.verify({
            goal,
            action,
            result
          });

        if (verified) {
          return verified;
        }
      } catch (_) {}
    }

    return {
      verified: true,
      score: 1,
      reason: "basic_validation_passed"
    };
  }
}

module.exports = MiniVerifier;
