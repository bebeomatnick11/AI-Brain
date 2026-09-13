"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const validator = require("./skill-validator");

const DATA_DIR = path.join(__dirname, "..", "data");
const PRIMARY_FILE = path.join(DATA_DIR, "user-skills.json");

// Hỗ trợ database cũ nếu trước đây file nằm trong agent/
const LEGACY_FILE = path.join(__dirname, "user-skills.json");

const SCHEMA_VERSION = 1;

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function emptyDatabase() {
    return {
        schemaVersion: SCHEMA_VERSION,
        users: {}
    };
}

function normalizeDatabase(data) {
    if (!data || typeof data !== "object") {
        return emptyDatabase();
    }

    // Database mới
    if (data.users && typeof data.users === "object") {
        return {
            schemaVersion: Number(data.schemaVersion) || SCHEMA_VERSION,
            users: data.users
        };
    }

    // Database cũ:
    // {
    //   "USER_ID": {
    //      "skills": []
    //   }
    // }
    const users = {};

    for (const [userId, value] of Object.entries(data)) {
        if (!value || typeof value !== "object") continue;

        if (Array.isArray(value.skills)) {
            users[userId] = {
                skills: value.skills,
                settings: {
                    autoActivate: true,
                    allowMultipleSkills: true,
                    maxActiveSkills: 8
                }
            };
        }
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        users
    };
}

function readDatabase() {
    ensureDataDir();

    let file = PRIMARY_FILE;

    if (!fs.existsSync(PRIMARY_FILE) && fs.existsSync(LEGACY_FILE)) {
        file = LEGACY_FILE;
    }

    if (!fs.existsSync(file)) {
        const db = emptyDatabase();
        writeDatabase(db);
        return db;
    }

    try {
        const raw = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        return normalizeDatabase(parsed);
    } catch (error) {
        console.error("[UserSkillManager] Failed to read database:", error);

        // Không ghi đè database hỏng.
        return emptyDatabase();
    }
}

function writeDatabase(db) {
    ensureDataDir();

    const tempFile = PRIMARY_FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(db, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, PRIMARY_FILE);
}

function normalizeUserId(userId) {
    if (userId === undefined || userId === null) {
        throw new Error("USER_ID_REQUIRED");
    }

    const id = String(userId).trim();

    if (!id) {
        throw new Error("USER_ID_REQUIRED");
    }

    if (id.length > 200) {
        throw new Error("USER_ID_TOO_LONG");
    }

    return id;
}

function ensureUser(db, userId) {
    if (!db.users[userId]) {
        db.users[userId] = {
            skills: [],
            settings: {
                autoActivate: true,
                allowMultipleSkills: true,
                maxActiveSkills: 8
            }
        };
    }

    if (!Array.isArray(db.users[userId].skills)) {
        db.users[userId].skills = [];
    }

    if (!db.users[userId].settings) {
        db.users[userId].settings = {
            autoActivate: true,
            allowMultipleSkills: true,
            maxActiveSkills: 8
        };
    }

    return db.users[userId];
}

function generateSkillId() {
    return "skill_" + crypto.randomBytes(10).toString("hex");
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function findSkillIndex(user, skillId) {
    return user.skills.findIndex(
        skill => skill && String(skill.id) === String(skillId)
    );
}

function findSkill(user, skillId) {
    const index = findSkillIndex(user, skillId);

    if (index === -1) {
        return null;
    }

    return user.skills[index];
}

/**
 * Tạo skill mới cho user.
 */
function create(userId, skillData) {
    userId = normalizeUserId(userId);

    if (!skillData || typeof skillData !== "object") {
        throw new Error("SKILL_DATA_REQUIRED");
    }

    const db = readDatabase();
    const user = ensureUser(db, userId);

    const validation = validator.validate(skillData);

    if (!validation.valid) {
        const error = new Error("SKILL_VALIDATION_FAILED");
        error.details = validation.errors || [];
        throw error;
    }

    const cleaned = validation.skill || validation.cleaned || skillData;

    const now = Date.now();

    const skill = {
        id: cleaned.id || generateSkillId(),

        name: cleaned.name,
        description: cleaned.description || "",

        detailedInstructions:
            Array.isArray(cleaned.detailedInstructions)
                ? cleaned.detailedInstructions
                : [],

        aiGuidance:
            cleaned.aiGuidance || "",

        triggers:
            Array.isArray(cleaned.triggers)
                ? cleaned.triggers
                : [],

        conditions:
            Array.isArray(cleaned.conditions)
                ? cleaned.conditions
                : [],

        examples:
            Array.isArray(cleaned.examples)
                ? cleaned.examples
                : [],

        priority:
            Number.isFinite(Number(cleaned.priority))
                ? Number(cleaned.priority)
                : 50,

        cooldown:
            Number.isFinite(Number(cleaned.cooldown))
                ? Number(cleaned.cooldown)
                : 0,

        enabled:
            cleaned.enabled !== false,

        scope:
            cleaned.scope || "user",

        permissions:
            Array.isArray(cleaned.permissions)
                ? cleaned.permissions
                : ["chat"],

        version: 1,

        metadata:
            cleaned.metadata &&
            typeof cleaned.metadata === "object"
                ? clone(cleaned.metadata)
                : {
                    author: "user",
                    source: "user-created"
                },

        createdAt: now,
        updatedAt: now
    };

    // Không cho trùng ID
    if (findSkill(user, skill.id)) {
        skill.id = generateSkillId();
    }

    // Không cho trùng tên trong cùng user
    const duplicateName = user.skills.some(
        existing =>
            existing &&
            String(existing.name).toLowerCase() ===
            String(skill.name).toLowerCase()
    );

    if (duplicateName) {
        const error = new Error("SKILL_NAME_ALREADY_EXISTS");
        throw error;
    }

    user.skills.push(skill);

    writeDatabase(db);

    return clone(skill);
}

/**
 * Tạo skill draft.
 * Draft chưa được lưu vào database.
 */
function createDraft(userId, skillData) {
    userId = normalizeUserId(userId);

    if (!skillData || typeof skillData !== "object") {
        throw new Error("SKILL_DATA_REQUIRED");
    }

    const validation = validator.validate(skillData);

    if (!validation.valid) {
        const error = new Error("SKILL_VALIDATION_FAILED");
        error.details = validation.errors || [];
        throw error;
    }

    const cleaned = validation.skill || validation.cleaned || skillData;

    const now = Date.now();

    return {
        id: generateSkillId(),

        name: cleaned.name,
        description: cleaned.description || "",

        detailedInstructions:
            Array.isArray(cleaned.detailedInstructions)
                ? cleaned.detailedInstructions
                : [],

        aiGuidance: cleaned.aiGuidance || "",

        triggers:
            Array.isArray(cleaned.triggers)
                ? cleaned.triggers
                : [],

        conditions:
            Array.isArray(cleaned.conditions)
                ? cleaned.conditions
                : [],

        examples:
            Array.isArray(cleaned.examples)
                ? cleaned.examples
                : [],

        priority: Number(cleaned.priority) || 50,
        cooldown: Number(cleaned.cooldown) || 0,

        enabled: true,
        scope: "user",

        permissions:
            Array.isArray(cleaned.permissions)
                ? cleaned.permissions
                : ["chat"],

        version: 1,

        metadata: {
            author: "user",
            source: "draft"
        },

        userId,
        createdAt: now,
        updatedAt: now,

        draft: true
    };
}

/**
 * Lấy một skill.
 */
function get(userId, skillId) {
    userId = normalizeUserId(userId);

    const db = readDatabase();
    const user = ensureUser(db, userId);

    const skill = findSkill(user, skillId);

    return skill ? clone(skill) : null;
}

/**
 * Lấy toàn bộ skill của user.
 */
function list(userId, options = {}) {
    userId = normalizeUserId(userId);

    const db = readDatabase();
    const user = ensureUser(db, userId);

    let skills = user.skills.slice();

    if (options.enabledOnly === true) {
        skills = skills.filter(skill => skill.enabled !== false);
    }

    if (options.disabledOnly === true) {
        skills = skills.filter(skill => skill.enabled === false);
    }

    if (options.sortByPriority !== false) {
        skills.sort(
            (a, b) =>
                Number(b.priority || 0) -
                Number(a.priority || 0)
        );
    }

    return clone(skills);
}

/**
 * Tìm skill bằng tên, description hoặc trigger.
 */
function search(userId, query) {
    userId = normalizeUserId(userId);

    const text = String(query || "")
        .trim()
        .toLowerCase();

    if (!text) {
        return [];
    }

    const skills = list(userId);

    return skills.filter(skill => {
        const haystack = [
            skill.name,
            skill.description,
            ...(skill.triggers || []),
            ...(skill.conditions || []),
            ...(skill.detailedInstructions || [])
        ]
            .join(" ")
            .toLowerCase();

        return haystack.includes(text);
    });
}

/**
 * Update skill.
 */
function update(userId, skillId, changes) {
    userId = normalizeUserId(userId);

    if (!changes || typeof changes !== "object") {
        throw new Error("CHANGES_REQUIRED");
    }

    const db = readDatabase();
    const user = ensureUser(db, userId);

    const index = findSkillIndex(user, skillId);

    if (index === -1) {
        throw new Error("SKILL_NOT_FOUND");
    }

    const oldSkill = user.skills[index];

    const merged = {
        ...oldSkill,
        ...clone(changes),

        // Không cho update các identity fields
        id: oldSkill.id,
        createdAt: oldSkill.createdAt,

        version: Number(oldSkill.version || 1) + 1,
        updatedAt: Date.now()
    };

    const validation = validator.validate(merged);

    if (!validation.valid) {
        const error = new Error("SKILL_VALIDATION_FAILED");
        error.details = validation.errors || [];
        throw error;
    }

    const cleaned =
        validation.skill ||
        validation.cleaned ||
        merged;

    user.skills[index] = {
        ...merged,
        ...cleaned,

        id: oldSkill.id,
        createdAt: oldSkill.createdAt,

        version: Number(oldSkill.version || 1) + 1,
        updatedAt: Date.now()
    };

    writeDatabase(db);

    return clone(user.skills[index]);
}

/**
 * Xóa skill.
 */
function remove(userId, skillId) {
    userId = normalizeUserId(userId);

    const db = readDatabase();
    const user = ensureUser(db, userId);

    const index = findSkillIndex(user, skillId);

    if (index === -1) {
        return {
            success: false,
            reason: "SKILL_NOT_FOUND"
        };
    }

    const removed = user.skills.splice(index, 1)[0];

    writeDatabase(db);

    return {
        success: true,
        skill: clone(removed)
    };
}

/**
 * Enable skill.
 */
function enable(userId, skillId) {
    return update(userId, skillId, {
        enabled: true
    });
}

/**
 * Disable skill.
 */
function disable(userId, skillId) {
    return update(userId, skillId, {
        enabled: false
    });
}

/**
 * Activate skill trong session.
 *
 * Skill vẫn phải enabled.
 * Đây chỉ là session activation, không sửa database.
 */
function activate(userId, skillId, sessionSkills = []) {
    userId = normalizeUserId(userId);

    const skill = get(userId, skillId);

    if (!skill) {
        return {
            success: false,
            reason: "SKILL_NOT_FOUND",
            sessionSkills
        };
    }

    if (skill.enabled === false) {
        return {
            success: false,
            reason: "SKILL_DISABLED",
            sessionSkills
        };
    }

    const exists = sessionSkills.some(
        id => String(id) === String(skill.id)
    );

    if (exists) {
        return {
            success: true,
            alreadyActive: true,
            sessionSkills: sessionSkills.slice()
        };
    }

    const db = readDatabase();
    const user = ensureUser(db, userId);

    const max =
        Number(user.settings?.maxActiveSkills) || 8;

    if (
        user.settings?.allowMultipleSkills === false &&
        sessionSkills.length > 0
    ) {
        return {
            success: false,
            reason: "MULTIPLE_SKILLS_DISABLED",
            sessionSkills: sessionSkills.slice()
        };
    }

    if (sessionSkills.length >= max) {
        return {
            success: false,
            reason: "MAX_ACTIVE_SKILLS_REACHED",
            sessionSkills: sessionSkills.slice()
        };
    }

    return {
        success: true,
        alreadyActive: false,
        sessionSkills: [
            ...sessionSkills,
            skill.id
        ]
    };
}

/**
 * Deactivate skill khỏi session.
 */
function deactivate(userId, skillId, sessionSkills = []) {
    userId = normalizeUserId(userId);

    return {
        success: true,
        sessionSkills: sessionSkills.filter(
            id => String(id) !== String(skillId)
        )
    };
}

/**
 * Cài đặt user skill settings.
 */
function getSettings(userId) {
    userId = normalizeUserId(userId);

    const db = readDatabase();
    const user = ensureUser(db, userId);

    return clone(user.settings);
}

function updateSettings(userId, changes) {
    userId = normalizeUserId(userId);

    if (!changes || typeof changes !== "object") {
        throw new Error("SETTINGS_REQUIRED");
    }

    const db = readDatabase();
    const user = ensureUser(db, userId);

    user.settings = {
        ...user.settings,
        ...changes
    };

    if (
        !Number.isFinite(
            Number(user.settings.maxActiveSkills)
        )
    ) {
        user.settings.maxActiveSkills = 8;
    }

    user.settings.maxActiveSkills = Math.max(
        1,
        Math.min(
            50,
            Number(user.settings.maxActiveSkills)
        )
    );

    writeDatabase(db);

    return clone(user.settings);
}

/**
 * Xóa toàn bộ skill của user.
 */
function clear(userId) {
    userId = normalizeUserId(userId);

    const db = readDatabase();
    const user = ensureUser(db, userId);

    const count = user.skills.length;

    user.skills = [];

    writeDatabase(db);

    return {
        success: true,
        deleted: count
    };
}

/**
 * Export database thống kê.
 */
function stats(userId) {
    userId = normalizeUserId(userId);

    const skills = list(userId);

    return {
        total: skills.length,

        enabled: skills.filter(
            skill => skill.enabled !== false
        ).length,

        disabled: skills.filter(
            skill => skill.enabled === false
        ).length,

        averagePriority:
            skills.length === 0
                ? 0
                : skills.reduce(
                    (sum, skill) =>
                        sum + Number(skill.priority || 0),
                    0
                ) / skills.length
    };
}

module.exports = {
    create,
    createSkill: create,

    createDraft,

    get,
    list,
    getAll: list,

    search,

    update,
    remove,
    delete: remove,

    enable,
    disable,

    activate,
    deactivate,

    getSettings,
    updateSettings,

    clear,
    stats
};
