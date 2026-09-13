const path = require("path");
const config = require("./config");
const {
  readJson,
  writeJson
} = require("./storage");

const FILE = path.join(
  config.DATA_DIR,
  "conversations.json"
);

function load() {
  return readJson(FILE, {});
}

function save(db) {
  writeJson(FILE, db);
}

function get(userId) {
  const db = load();

  if (!Array.isArray(db[userId])) {
    db[userId] = [];
  }

  return db[userId];
}

function add(userId, role, content) {
  const db = load();

  if (!Array.isArray(db[userId])) {
    db[userId] = [];
  }

  db[userId].push({
    role,
    content: String(content || "")
      .slice(0, 30000),
    timestamp: Date.now()
  });

  if (
    db[userId].length >
    config.AGENT.maxHistory * 2
  ) {
    db[userId] =
      db[userId].slice(
        -config.AGENT.maxHistory * 2
      );
  }

  save(db);
}

function clear(userId) {
  const db = load();

  delete db[userId];

  save(db);
}

module.exports = {
  get,
  add,
  clear
};
