const crypto = require("crypto");

function createSkillDraft(input) {
  return {
    id: crypto.randomUUID(),

    name: String(input.name || "").trim(),

    description:
      String(input.description || "").trim(),

    detailedInstructions:
      Array.isArray(input.detailedInstructions)
        ? input.detailedInstructions
        : [],

    aiGuidance:
      String(input.aiGuidance || "").trim(),

    triggers:
      Array.isArray(input.triggers)
        ? input.triggers
        : [],

    conditions:
      input.conditions || {},

    examples:
      Array.isArray(input.examples)
        ? input.examples
        : [],

    priority:
      Number.isFinite(input.priority)
        ? input.priority
        : 50,

    cooldown:
      Number.isFinite(input.cooldown)
        ? input.cooldown
        : 0,

    enabled: true,

    version: 1,

    scope: "user",

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()
  };
}

module.exports = {
  createSkillDraft
};
