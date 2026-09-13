const path = require("path");

const ROOT = path.join(__dirname, "..");

module.exports = {
  ROOT,

  DATA_DIR: path.join(ROOT, "data"),
  SKILLS_DIR: path.join(ROOT, "skills"),

  AI: {
    endpoint:
      process.env.AI_ENDPOINT ||
      "https://text.pollinations.ai/openai",

    apiKey:
      process.env.AI_API_KEY ||
      "",

    model:
      process.env.AI_MODEL ||
      "openai",

    timeoutMs:
      Number(process.env.AI_TIMEOUT_MS) || 45000,

    maxRetries:
      Number(process.env.AI_MAX_RETRIES) || 2
  },

  AGENT: {
    maxHistory: 30,
    maxContextChars: 24000,
    maxPlanSteps: 8,

    maxUserMessageChars: 12000,
    maxResponseChars: 30000,

    rememberAutomatically: true,
    persistConversation: true,

    verifyResponse: true
  },

  SECURITY: {
    maxMemoryPerUser: 500,
    maxSkillsPerUser: 100,

    maxSkillName: 120,
    maxSkillDescription: 2000,
    maxSkillInstructions: 12000
  }
};
