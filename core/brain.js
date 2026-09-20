const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(
    __dirname,
    "..",
    "data",
    "brains.json"
);

function load() {
    try {
        return JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
        return {};
    }
}

function save(data) {
    fs.writeFileSync(
        FILE,
        JSON.stringify(data, null, 2)
    );
}

function createBrain(input = {}) {
    const data = load();

    const brainId =
        input.brainId ||
        `ASTRA-${input.userId || crypto.randomUUID()}`;

    const now = Date.now();

    const previous = data[brainId] || {};

    const brain = {
        ...previous,

        brainId,

        userId: String(
            input.userId ||
            previous.userId ||
            ""
        ),

        displayName:
            input.displayName ||
            previous.displayName ||
            "Unknown",

        originalName:
            input.originalName ||
            previous.originalName ||
            input.displayName ||
            "Unknown",

        brainVersion: "6.0.0",

        createdAt:
            previous.createdAt || now,

        lastSeen: now,

        status: "online",

        skills:
            input.skills ||
            previous.skills ||
            [],

        activeSkills:
            input.activeSkills ||
            previous.activeSkills ||
            [],

        device:
            input.device ||
            previous.device ||
            "unknown",

        country:
            input.country ||
            previous.country ||
            "unknown"
    };

    data[brainId] = brain;

    save(data);

    return brain;
}

function getBrain(brainId) {
    const data = load();
    return data[brainId] || null;
}

function heartbeatBrain(input = {}) {
    const existing = getBrain(input.brainId);

    if (!existing) {
        return createBrain(input);
    }

    return createBrain({
        ...existing,
        ...input,
        brainId: existing.brainId
    });
}

function listBrains() {
    const data = load();
    const now = Date.now();

    return Object.values(data).map(brain => ({
        ...brain,
        status:
            now - Number(brain.lastSeen || 0) <
            120000
                ? "online"
                : "offline"
    }));
}

module.exports = {
    createBrain,
    getBrain,
    heartbeatBrain,
    listBrains
};
