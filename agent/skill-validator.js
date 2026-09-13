const LIMITS = {
  name: 200,
  description: 3000,
  instruction: 5000,
  instructions: 50,
  triggers: 50,
  examples: 30
};

function clean(value, max) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function validate(skill) {
  if (!skill) {
    throw new Error("SKILL_EMPTY");
  }

  const name =
    clean(
      skill.name,
      LIMITS.name
    );

  if (!name) {
    throw new Error(
      "SKILL_NAME_REQUIRED"
    );
  }

  const description =
    clean(
      skill.description,
      LIMITS.description
    );

  const instructions =
    Array.isArray(
      skill.detailedInstructions
    )
      ? skill.detailedInstructions
          .slice(
            0,
            LIMITS.instructions
          )
          .map(x =>
            clean(
              x,
              LIMITS.instruction
            )
          )
          .filter(Boolean)
      : [];

  const triggers =
    Array.isArray(skill.triggers)
      ? skill.triggers
          .slice(
            0,
            LIMITS.triggers
          )
          .map(x => clean(x, 200))
          .filter(Boolean)
      : [];

  const examples =
    Array.isArray(skill.examples)
      ? skill.examples
          .slice(
            0,
            LIMITS.examples
          )
          .map(x => clean(x, 1000))
          .filter(Boolean)
      : [];

  return {
    ...skill,

    name,

    description,

    detailedInstructions:
      instructions,

    aiGuidance:
      clean(
        skill.aiGuidance,
        LIMITS.instruction
      ),

    triggers,

    examples
  };
}

module.exports = {
  validate
};
