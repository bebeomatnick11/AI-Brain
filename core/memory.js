const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(
    __dirname,
    "..",
    "data",
    "memories"
);

if (!fs.existsSync(ROOT)) {
    fs.mkdirSync(ROOT, {
        recursive: true
    });
}

function fileFor(brainId) {
    const safe = String(brainId)
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    return path.join(ROOT, `${safe}.json`);
}

function load(brainId) {
    try {
        return JSON.parse(
            fs.readFileSync(fileFor(brainId), "utf8")
        );
    } catch {
        return [];
    }
}

function save(brainId, memories) {
    fs.writeFileSync(
        fileFor(brainId),
        JSON.stringify(memories, null, 2)
    );
}

function tokenize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(x => x.length >= 2);
}

function similarity(a, b) {
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));

    if (!A.size || !B.size) {
        return 0;
    }

    let common = 0;

    for (const word of A) {
        if (B.has(word)) {
            common++;
        }
    }

    return common / Math.sqrt(A.size * B.size);
}

function remember(brainId, content, metadata = {}) {
    if (!brainId || !content) {
        throw new Error(
            "brainId and content are required"
        );
    }

    const memories = load(brainId);

    const memory = {
        id: crypto.randomUUID(),

        content: String(content),

        metadata,

        createdAt: Date.now(),

        importance:
            Number(metadata.importance) || 0.5,

        accessCount: 0,

        lastAccessed: null
    };

    memories.push(memory);

    const trimmed =
        memories.length > 5000
            ? memories.slice(-5000)
            : memories;

    save(brainId, trimmed);

    return memory;
}

function recall(brainId, query, limit = 12) {
    const memories = load(brainId);

    const ranked = memories
        .map(memory => {
            const semantic =
                similarity(query, memory.content);

            const recency =
                Math.max(
                    0,
                    1 -
                    (
                        Date.now() -
                        memory.createdAt
                    ) /
                    (1000 * 60 * 60 * 24 * 30)
                );

            const importance =
                Number(memory.importance) || 0;

            const score =
                semantic * 0.65 +
                importance * 0.25 +
                recency * 0.10;

            return {
                ...memory,
                score
            };
        })
        .filter(x => x.score >= 0.18)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    for (const memory of ranked) {
        memory.accessCount =
            Number(memory.accessCount || 0) + 1;

        memory.lastAccessed = Date.now();
    }

    save(brainId, memories);

    return ranked;
}

function learn(brainId, observation, context = {}) {
    return remember(
        brainId,
        observation,
        {
            type: "learning",
            importance: 0.75,
            ...context
        }
    );
}

module.exports = {
    remember,
    recall,
    learn
};
