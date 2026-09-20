const skills = {
    build: {
        name: "build",
        description: "Build systems and code"
    },

    code: {
        name: "code",
        description: "Write and understand code"
    },

    debug: {
        name: "debug",
        description: "Find and fix bugs"
    },

    research: {
        name: "research",
        description: "Research information"
    },

    analyze: {
        name: "analyze",
        description: "Analyze data and context"
    },

    observe: {
        name: "observe",
        description: "Observe Roblox world state"
    },

    navigate: {
        name: "navigate",
        description: "Plan movement/navigation"
    },

    security: {
        name: "security",
        description: "Defensive security analysis"
    }
};

function listSkills() {
    return Object.values(skills);
}

function getSkill(name) {
    return skills[name] || null;
}

module.exports = {
    listSkills,
    getSkill
};
