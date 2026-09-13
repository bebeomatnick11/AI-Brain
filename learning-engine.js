"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const brain = require("./brain-client");

const file = path.join(__dirname, "..", "data", "learning-candidates.json");
const MAX_CANDIDATES = 500;

function load() {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return []; }
}
function save(items) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(items.slice(-MAX_CANDIDATES), null, 2));
  fs.renameSync(tmp, file);
}
function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}
function observe(input) {
  const item = {
    id: "cand_" + crypto.randomBytes(8).toString("hex"),
    fingerprint: hash(input),
    userId: String(input.userId || "unknown"),
    gameId: String(input.gameId || "unknown"),
    topic: String(input.topic || "game-behavior").slice(0, 120),
    observation: String(input.observation || "").slice(0, 2000),
    evidence: Array.isArray(input.evidence) ? input.evidence.slice(0, 10) : [],
    confidence: Math.max(0, Math.min(1, Number(input.confidence) || 0.5)),
    visibility: input.visibility === "personal" ? "personal" : "shared",
    createdAt: Date.now(),
    verified: false
  };
  const items = load();
  const existing = items.find(x => x.fingerprint === item.fingerprint);
  if (existing) {
    existing.evidence = [...(existing.evidence || []), ...item.evidence].slice(-20);
    existing.confidence = Math.max(existing.confidence || 0, item.confidence);
    existing.updatedAt = Date.now();
    save(items);
    return existing;
  }
  items.push(item);
  save(items);
  return item;
}

async function verifyAndCommit(candidate, options = {}) {
  if (!candidate || candidate.verified) return { committed: false, reason: "already_verified" };
  const evidenceCount = Array.isArray(candidate.evidence) ? candidate.evidence.length : 0;
  const threshold = Number(options.threshold) || 0.85;
  if (candidate.confidence < threshold || evidenceCount < 2) {
    return { committed: false, reason: "insufficient_evidence", candidate };
  }

  const knowledge = {
    id: "know_" + crypto.randomBytes(10).toString("hex"),
    type: "learned_pattern",
    gameId: candidate.gameId,
    topic: candidate.topic,
    lesson: candidate.observation,
    confidence: candidate.confidence,
    evidenceCount,
    visibility: candidate.visibility,
    source: "astra-learning-engine",
    verified: true,
    createdAt: Date.now()
  };

  const result = await brain.submitKnowledge(knowledge);
  candidate.verified = true;
  candidate.knowledgeId = knowledge.id;
  candidate.updatedAt = Date.now();
  const items = load();
  const index = items.findIndex(x => x.id === candidate.id);
  if (index >= 0) items[index] = candidate;
  save(items);
  return { committed: true, knowledge, result };
}

async function recall(query, options = {}) {
  return brain.recallKnowledge(query, options);
}

module.exports = { observe, verifyAndCommit, recall };
