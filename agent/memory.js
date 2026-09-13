const path = require("path");
const crypto = require("crypto");

const {
  readJson,
  writeJson
} = require("./storage");

const config = require("./config");

const FILE = path.join(
  config.DATA_DIR,
  "memory.json"
);

function load() {
  const data = readJson(FILE, {});

  if (!data || typeof data !== "object") {
    return {};
  }

  return data;
}

function save(data) {
  writeJson(FILE, data);
}

function ensureUser(db, userId) {
  if (!Array.isArray(db[userId])) {
    db[userId] = [];
  }

  return db[userId];
}

function remember(userId, content, options = {}) {
  const db = load();

  const memories = ensureUser(db, userId);

  const text = String(content || "")
    .trim()
    .slice(0, 5000);

  if (!text) {
    throw new Error("Memory content is empty");
  }

  const now = Date.now();

  const item = {
    id: crypto.randomUUID(),
    key: options.key
      ? String(options.key).slice(0, 200)
      : null,

    content: text,

    tags: Array.isArray(options.tags)
      ? options.tags
          .map(String)
          .slice(0, 20)
      : [],

    source: options.source || "user",

    createdAt: now,
    updatedAt: now
  };

  memories.unshift(item);

  if (
    memories.length >
    config.SECURITY.maxMemoryPerUser
  ) {
    memories.length =
      config.SECURITY.maxMemoryPerUser;
  }

  save(db);

  return item;
}

function getAll(userId) {
  const db = load();

  return ensureUser(db, userId);
}

function search(userId, query) {
  const memories = getAll(userId);

  const q = String(query || "")
    .toLowerCase()
    .trim();

  if (!q) {
    return memories;
  }

  return memories.filter(memory => {
    const haystack = [
      memory.key || "",
      memory.content || "",
      ...(memory.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

function forget(userId, id) {
  const db = load();

  const memories = ensureUser(db, userId);

  const before = memories.length;

  db[userId] = memories.filter(
    memory => memory.id !== id
  );

  save(db);

  return {
    removed:
      before !== db[userId].length
  };
}

function clear(userId) {
  const db = load();

  db[userId] = [];

  save(db);

  return {
    cleared: true
  };
}

function buildContext(userId, query = "") {
  let memories = search(
    userId,
    query
  );

  if (!memories.length) {
    memories = getAll(userId);
  }

  return memories
    .slice(0, 20)
    .map(memory => {
      return `- ${memory.content}`;
    })
    .join("\n");
}

function detectMemoryCommand(message) {
  const text = String(message || "")
    .toLowerCase()
    .trim();

  if (
    /^(hãy nhớ|nhớ rằng|ghi nhớ|lưu lại|remember that|remember this)\b/i
      .test(text)
  ) {
    return "remember";
  }

  if (
    /^(bạn nhớ gì|what do you remember|do you remember)\b/i
      .test(text)
  ) {
    return "recall";
  }

  if (
    /^(quên|xóa ký ức|forget|clear memory)\b/i
      .test(text)
  ) {
    return "forget";
  }

  return null;
}

module.exports = {
  remember,
  getAll,
  search,
  forget,
  clear,
  buildContext,
  detectMemoryCommand
};
