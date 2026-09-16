'use strict';

function detectIntent(input) {
  const text = String(input?.text || '').toLowerCase();

  if (!text) return 'unknown';

  if (
    /\b(remember|recall|memory|nhớ|hồi tưởng)\b/.test(text)
  ) {
    return 'memory';
  }

  if (
    /\b(search|research|find|tìm|tra cứu|nghiên cứu)\b/.test(text)
  ) {
    return 'research';
  }

  if (
    /\b(code|script|coding|lua|javascript|python|code)\b/.test(text)
  ) {
    return 'code';
  }

  if (
    /\b(debug|error|bug|lỗi|fix|sửa)\b/.test(text)
  ) {
    return 'debug';
  }

  if (
    /\b(build|create|make|tạo|xây dựng)\b/.test(text)
  ) {
    return 'build';
  }

  if (
    /\b(observe|scan|inspect|quan sát)\b/.test(text)
  ) {
    return 'observe';
  }

  return 'conversation';
}

function calculateComplexity(input) {
  const text = String(input?.text || '');

  let score = 0;

  if (text.length > 300) score += 1;
  if (text.length > 1000) score += 2;

  if (/\b(and|then|after|before|sau đó|rồi|tiếp theo)\b/i.test(text)) {
    score += 1;
  }

  if (/\b(code|debug|research|analyze|build)\b/i.test(text)) {
    score += 2;
  }

  return Math.min(score, 5);
}

function route(input) {
  const intent = detectIntent(input);
  const complexity = calculateComplexity(input);

  let route = 'STANDARD_REASONING';

  if (intent === 'memory') {
    route = 'FAST_MEMORY';
  } else if (intent === 'research') {
    route = 'RETRIEVAL';
  } else if (intent === 'debug' || intent === 'code') {
    route = complexity >= 3
      ? 'DEEP_COGNITION'
      : 'STANDARD_REASONING';
  } else if (intent === 'build') {
    route = 'ACTION';
  }

  return {
    intent,
    complexity,
    route,
    requiresMemory: [
      'memory',
      'conversation',
      'code',
      'debug',
      'build'
    ].includes(intent),
    requiresRetrieval: intent === 'research',
    requiresVerification: [
      'code',
      'debug',
      'build',
      'research'
    ].includes(intent)
  };
}

module.exports = {
  detectIntent,
  calculateComplexity,
  route
};
