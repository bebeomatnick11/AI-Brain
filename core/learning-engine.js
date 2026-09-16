'use strict';

function ensureLearning(db) {
  if (!db.learning) {
    db.learning = {
      observations: [],
      evidence: {},
      knowledge: {}
    };
  }

  if (!Array.isArray(db.learning.observations)) {
    db.learning.observations = [];
  }

  if (!db.learning.evidence) {
    db.learning.evidence = {};
  }

  if (!db.learning.knowledge) {
    db.learning.knowledge = {};
  }
}

function calculateConfidence(evidence) {
  const count = evidence.length;

  if (count <= 0) return 0;
  if (count === 1) return 0.15;
  if (count === 2) return 0.30;
  if (count === 3) return 0.45;
  if (count < 5) return 0.60;
  if (count < 10) return 0.80;

  return 0.95;
}

function classifyConfidence(confidence) {
  if (confidence >= 0.90) return 'strong';
  if (confidence >= 0.75) return 'learned';
  if (confidence >= 0.45) return 'possible';
  return 'candidate';
}

function addEvidence(db, input) {
  ensureLearning(db);

  const key =
    String(
      input.key ||
      input.term ||
      input.subject ||
      ''
    )
      .trim()
      .toLowerCase();

  if (!key) {
    throw new Error('Learning key is required');
  }

  if (!db.learning.evidence[key]) {
    db.learning.evidence[key] = [];
  }

  const evidence = {
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    key,

    source:
      input.source || 'unknown',

    userId:
      input.userId || null,

    context:
      String(input.context || '').slice(0, 1000),

    interpretation:
      input.interpretation || null,

    timestamp:
      new Date().toISOString()
  };

  db.learning.evidence[key].push(
    evidence
  );

  const confidence =
    calculateConfidence(
      db.learning.evidence[key]
    );

  const status =
    classifyConfidence(
      confidence
    );

  db.learning.knowledge[key] = {
    key,
    confidence,
    status,
    evidenceCount:
      db.learning.evidence[key].length,
    lastUpdated:
      evidence.timestamp
  };

  return db.learning.knowledge[key];
}

function getKnowledge(db, key) {
  ensureLearning(db);

  return (
    db.learning.knowledge[
      String(key || '')
        .trim()
        .toLowerCase()
    ] ||
    null
  );
}

module.exports = {
  ensureLearning,
  addEvidence,
  getKnowledge,
  calculateConfidence,
  classifyConfidence
};
