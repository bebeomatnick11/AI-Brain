const memory =
  require("./memory");

const personalization =
  require("./personalization");

const skillRegistry =
  require("./skill-registry");

function build({
  userId,
  sessionSkills = [],
  recentMessages = []
}) {
  const profile =
    personalization.get(userId);

  const skills =
    skillRegistry.getAll(
      userId,
      sessionSkills
    );

  const memoryContext =
    typeof memory.list === "function"
      ? memory.list(userId)
      : [];

  return {
    profile,
    memory: memoryContext,
    skills,
    recentMessages
  };
}

module.exports = {
  build
};
