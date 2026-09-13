"use strict";

const config = require("./config");

function baseUrl() {
  const value =
    config?.BRAIN?.endpoint ||
    config?.brain?.endpoint ||
    process.env.ASTRA_BRAIN_URL ||
    "https://ai-brain-yp8y.onrender.com";
  return String(value).replace(/\/+$/, "");
}

function secret() {
  return (
    config?.BRAIN?.secret ||
    config?.brain?.secret ||
    process.env.BRAIN_API_SECRET ||
    ""
  );
}

async function request(path, body) {
  const headers = { "Content-Type": "application/json" };
  if (secret()) headers.Authorization = `Bearer ${secret()}`;

  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}

  if (!response.ok) {
    throw new Error(data?.error || text || `HTTP ${response.status}`);
  }

  return data;
}

async function submitKnowledge(knowledge) {
  return request("/api/brain/learning/submit", { knowledge });
}

async function recallKnowledge(query, options = {}) {
  return request("/api/brain/learning/recall", {
    query: String(query || "").slice(0, 500),
    gameId: options.gameId || null,
    limit: Math.max(1, Math.min(20, Number(options.limit) || 8))
  });
}

module.exports = { submitKnowledge, recallKnowledge };
