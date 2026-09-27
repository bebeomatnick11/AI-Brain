class MiniPlanner {
  constructor(options = {}) {
    this.intentEngine =
      options.intentEngine || null;

    this.capabilityRegistry =
      options.capabilityRegistry || null;

    this.capabilityRouter =
      options.capabilityRouter || null;
  }

  async plan(input = {}) {
    const goal =
      String(input.goal || "").trim();

    if (!goal) {
      return {
        success: false,
        reason: "empty_goal",
        steps: []
      };
    }

    const intent =
      await this.detectIntent(goal);

    const steps =
      this.buildPlan(
        intent,
        goal
      );

    return {
      success: true,

      goal,

      intent,

      steps
    };
  }

  async detectIntent(goal) {
    if (this.intentEngine) {
      try {
        const result =
          await this.intentEngine.detect(goal);

        if (result) {
          return result;
        }
      } catch (_) {}
    }

    const text =
      goal.toLowerCase();

    if (
      /tìm|search|find|tra cứu/.test(text)
    ) {
      return "search";
    }

    if (
      /file|folder|project|code/.test(text)
    ) {
      return "workspace";
    }

    if (
      /ảnh|image|picture|hình/.test(text)
    ) {
      return "image.generate";
    }

    if (
      /video|clip|animation/.test(text)
    ) {
      return "video.generate";
    }

    if (
      /nhớ|remember|memory/.test(text)
    ) {
      return "memory";
    }

    if (
      /phân tích|analyze|analyse|debug/.test(text)
    ) {
      return "analyze";
    }

    return "general";
  }

  buildPlan(intent, goal) {
    switch (intent) {
      case "search":
        return [
          {
            capability: "web.search",
            goal
          },
          {
            capability: "verification",
            goal
          }
        ];

      case "workspace":
        return [
          {
            capability: "workspace.search",
            goal
          },
          {
            capability: "verification",
            goal
          }
        ];

      case "memory":
        return [
          {
            capability: "memory.search",
            goal
          }
        ];

      case "image.generate":
        return [
          {
            capability: "image.generate",
            goal
          },
          {
            capability: "verification",
            goal
          }
        ];

      case "video.generate":
        return [
          {
            capability: "video.generate",
            goal
          },
          {
            capability: "verification",
            goal
          }
        ];

      case "analyze":
        return [
          {
            capability: "workspace.search",
            goal
          },
          {
            capability: "analysis",
            goal
          },
          {
            capability: "verification",
            goal
          }
        ];

      default:
        return [
          {
            capability: "reasoning",
            goal
          }
        ];
    }
  }
}

module.exports = MiniPlanner;
