'use strict';

const MAX_OBSERVATIONS = 5000;
const MAX_SLAG_TERMS = 100;

function ensureLanguageStores(db) {
  if (!db.languages || typeof db.languages !== 'object' || Array.isArray(db.languages)) {
    db.languages = {};
  }

  if (!Array.isArray(db.languageObservations)) {
    db.languageObservations = [];
  }

  if (db.languageObservations.length > MAX_OBSERVATIONS) {
    db.languageObservations =
      db.languageObservations.slice(-MAX_OBSERVATIONS);
  }
}

function cleanString(value, max = 200) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanUserId(value) {
  const id = cleanString(value, 32);

  if (!/^\d+$/.test(id)) {
    return null;
  }

  return id;
}

function normalizeLanguage(value) {
  const language = cleanString(value, 40).toLowerCase();

  if (!language) {
    return 'unknown';
  }

  const aliases = {
    vi: 'Vietnamese',
    vietnamese: 'Vietnamese',
    'tiếng việt': 'Vietnamese',
    en: 'English',
    english: 'English',
    eng: 'English',
    zh: 'Chinese',
    chinese: 'Chinese',
    ja: 'Japanese',
    japanese: 'Japanese',
    ko: 'Korean',
    korean: 'Korean',
    es: 'Spanish',
    spanish: 'Spanish',
    fr: 'French',
    french: 'French'
  };

  return aliases[language] || cleanString(value, 40);
}

function normalizeSlangTerms(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map(x => cleanString(x, 60).toLowerCase())
      .filter(Boolean)
  )].slice(0, MAX_SLAG_TERMS);
}

function normalizeDefinitions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result = {};

  for (const key of Object.keys(value).slice(0, MAX_SLAG_TERMS)) {
    const cleanKey = cleanString(key, 60).toLowerCase();
    const cleanValue = cleanString(value[key], 300);

    if (cleanKey && cleanValue) {
      result[cleanKey] = cleanValue;
    }
  }

  return result;
}

function observeLanguage(db, input) {
  ensureLanguageStores(db);

  if (!input || typeof input !== 'object') {
    throw new Error('Invalid language observation');
  }

  const userId = cleanUserId(input.userId);

  if (!userId) {
    throw new Error('Invalid userId');
  }

  const username = cleanString(
    input.username || input.displayName,
    100
  );

  const language = normalizeLanguage(input.language);

  const confidence = Math.max(
    0,
    Math.min(
      1,
      Number(input.confidence) || 0
    )
  );

  const slangTerms = normalizeSlangTerms(
    input.slangTerms
  );

  const slangDefinitions = normalizeDefinitions(
    input.slangDefinitions
  );

  const timestamp = Date.now();

  if (!db.languages[userId]) {
    db.languages[userId] = {
      userId,
      username: username || null,
      languages: {},
      slang: {},
      firstSeen: timestamp,
      lastSeen: timestamp,
      observationCount: 0
    };
  }

  const profile = db.languages[userId];

  profile.username =
    username ||
    profile.username ||
    null;

  profile.lastSeen = timestamp;
  profile.observationCount =
    Number(profile.observationCount || 0) + 1;

  if (!profile.languages[language]) {
    profile.languages[language] = {
      count: 0,
      confidence: 0,
      firstSeen: timestamp,
      lastSeen: timestamp
    };
  }

  const languageProfile =
    profile.languages[language];

  languageProfile.count++;

  languageProfile.confidence =
    Math.max(
      Number(languageProfile.confidence || 0),
      confidence
    );

  languageProfile.lastSeen = timestamp;

  for (const slang of slangTerms) {
    if (!profile.slang[slang]) {
      profile.slang[slang] = {
        count: 0,
        confidence: 0,
        definition:
          slangDefinitions[slang] || null,
        firstSeen: timestamp,
        lastSeen: timestamp
      };
    }

    const row = profile.slang[slang];

    row.count++;

    row.confidence =
      Math.max(
        Number(row.confidence || 0),
        confidence
      );

    if (
      slangDefinitions[slang] &&
      !row.definition
    ) {
      row.definition =
        slangDefinitions[slang];
    }

    row.lastSeen = timestamp;
  }

  const observation = {
    id:
      'lang_' +
      timestamp +
      '_' +
      Math.random()
        .toString(36)
        .slice(2, 10),

    userId,

    username:
      username || null,

    language,

    confidence,

    slangTerms,

    slangDefinitions,

    pattern:
      cleanString(input.pattern, 300) || null,

    context:
      cleanString(input.context, 300) || null,

    gameId:
      cleanString(input.gameId, 100) || null,

    placeId:
      cleanString(input.placeId, 100) || null,

    visibility:
      'personal',

    createdAt:
      timestamp
  };

  db.languageObservations.push(
    observation
  );

  if (
    db.languageObservations.length >
    MAX_OBSERVATIONS
  ) {
    db.languageObservations =
      db.languageObservations.slice(
        -MAX_OBSERVATIONS
      );
  }

  return profile;
}

function languageDashboard(db) {
  ensureLanguageStores(db);

  const languages = {};
  const slang = {};

  for (const profile of Object.values(db.languages)) {
    for (const [language, data] of Object.entries(
      profile.languages || {}
    )) {
      if (!languages[language]) {
        languages[language] = {
          count: 0,
          users: 0,
          maxConfidence: 0
        };
      }

      languages[language].count +=
        Number(data.count || 0);

      languages[language].users++;

      languages[language].maxConfidence =
        Math.max(
          languages[language].maxConfidence,
          Number(data.confidence || 0)
        );
    }

    for (const [term, data] of Object.entries(
      profile.slang || {}
    )) {
      if (!slang[term]) {
        slang[term] = {
          count: 0,
          users: 0,
          confidence: 0,
          definition:
            data.definition || null
        };
      }

      slang[term].count +=
        Number(data.count || 0);

      slang[term].users++;

      slang[term].confidence =
        Math.max(
          slang[term].confidence,
          Number(data.confidence || 0)
        );

      if (
        !slang[term].definition &&
        data.definition
      ) {
        slang[term].definition =
          data.definition;
      }
    }
  }

  const languageList =
    Object.entries(languages)
      .sort(
        (a, b) =>
          b[1].count -
          a[1].count
      )
      .map(
        ([name, data]) => ({
          name,
          ...data
        })
      );

  const slangList =
    Object.entries(slang)
      .sort(
        (a, b) =>
          b[1].count -
          a[1].count
      )
      .map(
        ([term, data]) => ({
          term,
          ...data
        })
      );

  return {
    users:
      Object.keys(db.languages).length,

    observations:
      db.languageObservations.length,

    languages:
      languageList,

    slang:
      slangList
  };
}

module.exports = {
  ensureLanguageStores,
  observeLanguage,
  languageDashboard
};
