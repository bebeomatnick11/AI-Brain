"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const file = path.join(__dirname, "..", "data", "pending-actions.json");

function empty() { return { version: 1, users: {} }; }
function ensure() {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(empty(), null, 2));
}
function load() {
  ensure();
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data && data.users ? data : empty();
  } catch { return empty(); }
}
function save(data) {
  ensure();
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
function id() { return "req_" + crypto.randomBytes(10).toString("hex"); }
function user(data, userId) {
  const key = String(userId);
  if (!data.users[key]) data.users[key] = { items: [] };
  return data.users[key];
}
function create(userId, payload) {
  const data = load();
  const row = {
    id: id(),
    type: String(payload.type || "proposal"),
    title: String(payload.title || "AI proposal").slice(0, 200),
    description: String(payload.description || "").slice(0, 2000),
    goal: String(payload.goal || "").slice(0, 1000),
    status: "pending",
    attempts: 0,
    maxAttempts: Math.max(1, Math.min(8, Number(payload.maxAttempts) || 3)),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}
  };
  user(data, userId).items.unshift(row);
  save(data);
  return row;
}
function list(userId) { return user(load(), userId).items; }
function decide(userId, requestId, decision) {
  const data = load();
  const item = user(data, userId).items.find(x => x.id === requestId);
  if (!item) return null;
  const value = String(decision).toLowerCase();
  if (!["accept", "reject", "wait", "cancel"].includes(value)) throw new Error("INVALID_DECISION");
  item.status = value === "accept" ? "approved" : value === "wait" ? "pending" : value === "reject" ? "rejected" : "cancelled";
  item.updatedAt = Date.now();
  save(data);
  return item;
}
function recordAttempt(userId, requestId, result) {
  const data = load();
  const item = user(data, userId).items.find(x => x.id === requestId);
  if (!item) return null;
  item.attempts += 1;
  item.lastResult = String(result || "").slice(0, 1000);
  item.updatedAt = Date.now();
  if (item.attempts >= item.maxAttempts && result !== "success") item.status = "failed";
  if (result === "success") item.status = "succeeded";
  save(data);
  return item;
}
module.exports = { create, list, decide, recordAttempt };
