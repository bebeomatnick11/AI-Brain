const tools = {
    memory: {
        name: "memory",
        description:
            "Store and retrieve Astra memories",
        safe: true
    },

    observe: {
        name: "observe",
        description:
            "Process world observations from Roblox",
        safe: true
    },

    analyze: {
        name: "analyze",
        description:
            "Analyze structured information",
        safe: true
    },

    web: {
        name: "web",
        description:
            "Search external information through an approved backend",
        safe: true
    },

    code: {
        name: "code",
        description:
            "Analyze and generate code",
        safe: true
    },

    debug: {
        name: "debug",
        description:
            "Analyze errors and propose fixes",
        safe: true
    },

    security: {
        name: "security",
        description:
            "Analyze security configuration and defensive issues",
        safe: true
    }
};

function getTools() {
    return Object.values(tools);
}

function getTool(name) {
    return tools[name] || null;
}

module.exports = {
    getTools,
    getTool
};
