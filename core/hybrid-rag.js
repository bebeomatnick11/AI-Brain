'use strict';

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function keywordScore(query, text) {
  const q = new Set(tokenize(query));
  const t = tokenize(text);

  if (!q.size || !t.length) return 0;

  let matches = 0;

  for (const token of q) {
    if (t.includes(token)) {
      matches++;
    }
  }

  return matches / q.size;
}

function semanticScore(query, item) {
  const text = [
    item.title,
    item.content,
    item.summary,
    item.description,
    ...(item.tags || [])
  ]
    .filter(Boolean)
    .join(' ');

  return keywordScore(query, text);
}

function hybridScore(query, item) {
  const keyword = keywordScore(
    query,
    item.content || item.text || ''
  );

  const semantic = semanticScore(
    query,
    item
  );

  const confidence =
    Number(item.confidence || 0);

  return (
    keyword * 0.45 +
    semantic * 0.35 +
    confidence * 0.20
  );
}

function search(query, documents, options = {}) {
  const limit = options.limit || 10;

  return (documents || [])
    .map(item => ({
      ...item,
      score: hybridScore(query, item)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function buildContext(results) {
  return results
    .map((item, index) => {
      return [
        `[SOURCE ${index + 1}]`,
        item.title || 'Untitled',
        item.content ||
          item.text ||
          item.summary ||
          ''
      ].join('\n');
    })
    .join('\n\n');
}

module.exports = {
  search,
  hybridScore,
  buildContext
};
