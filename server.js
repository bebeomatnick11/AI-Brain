/**
 * ============================================================
 * ASTRA BRAIN REGISTRY V6
 * Backward-compatible Player Intelligence Registry
 * ============================================================
 *
 * Giữ:
 * - Brain registration
 * - Brain heartbeat
 * - Dashboard auth
 * - Skills
 * - Online/offline tracking
 * - Existing brains.json
 *
 * Thêm:
 * - Player profiles
 * - Player description
 * - Username history
 * - DisplayName history
 * - Avatar history
 * - Device history
 * - Session statistics
 * - Playtime
 * - First/last seen
 * - Player telemetry
 * - Player profile API
 *
 * ASTRA BRAIN V6:
 * - Collective Intelligence
 * - Game discovery
 * - Shared knowledge
 * - Personal knowledge
 * - System knowledge
 * - Learning events
 * - Verified knowledge
 * - Game learning score
 *
 * ROBLOX GAME METADATA:
 * - Game description
 * - Game icon
 * - Game thumbnail
 * - Universe ID resolution
 * - Metadata caching
 *
 * Node 18+
 * Zero external runtime dependencies
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const skillRegistry =
  require('./skills/skill-registry');

const {
  BrainRuntime
} = require('./core/brain-runtime');

const {
  ToolRegistry
} = require('./core/tool-registry');

const memoryTool =
  require('./tools/memory-tool');

const knowledgeTool =
  require('./tools/knowledge-tool');

const playerTool =
  require('./tools/player-tool');

const gameTool =
  require('./tools/game-tool');

// ============================================================
// CONFIG
// ============================================================

const PORT = Number(process.env.PORT || 3000);

const DASHBOARD_PASSWORD =
  process.env.DASHBOARD_PASSWORD || 'ChangeMe_InProduction';

const BRAIN_API_SECRET =
  process.env.BRAIN_API_SECRET ||
  'AstraBrainSecret_ChangeMe_InProduction';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.randomBytes(32).toString('hex');

const SESSION_MAX_AGE_MS =
  8 * 60 * 60 * 1000;

const OFFLINE_MS =
  2 * 60 * 1000;

const PLAYER_SESSION_TIMEOUT_MS =
  2 * 60 * 1000;

const SAVE_INTERVAL_MS =
  8000;

const NODE_ENV =
  process.env.NODE_ENV || 'development';

// ============================================================
// ROBLOX GAME METADATA CONFIG
// ============================================================

const ROBLOX_GAME_METADATA_TTL_MS =
  30 * 60 * 1000;

const ROBLOX_GAME_METADATA_TIMEOUT_MS =
  8000;

// ============================================================
// STORAGE
// ============================================================

const dataDir =
  process.env.DATA_DIR ||
  path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath =
  path.join(dataDir, 'brains.json');

function createEmptyDB() {

  return {

    brains: {},

    players: {},

    playerSessions: {},

    sessions: {},

    loginAttempts: {},

    // ========================================================
    // ASTRA BRAIN V6 — COLLECTIVE INTELLIGENCE
    // ========================================================

    games: {},

    knowledge: {},
    learningEvents: [],

    languages: {},

    languageObservations: []
  };
}

function loadDB() {

  try {

    if (!fs.existsSync(dbPath)) {

      return createEmptyDB();
    }

    const data =
      JSON.parse(
        fs.readFileSync(
          dbPath,
          'utf8'
        )
      );

    return {

      brains:
        data.brains || {},

      players:
        data.players || {},

      playerSessions:
        data.playerSessions || {},

      sessions:
        data.sessions || {},

      loginAttempts:
        data.loginAttempts || {},

      // ======================================================
      // ASTRA BRAIN V6
      // ======================================================

      games:
        data.games &&
        typeof data.games ===
        'object'
          ? data.games
          : {},

      knowledge:
  data.knowledge &&
  typeof data.knowledge ===
  'object'
    ? data.knowledge
    : {},

      learningEvents:
  Array.isArray(
    data.learningEvents
  )
    ? data.learningEvents
    : [],

      languages:
  data.languages &&
  typeof data.languages ===
  'object'
    ? data.languages
    : {},

      languageObservations:
  Array.isArray(
    data.languageObservations
  )
    ? data.languageObservations
    : []
    };

  } catch (e) {

    console.error(
      'DB load error:',
      e.message
    );

    return createEmptyDB();
  }
}

let db =
  loadDB();

let dirty =
  false;

function markDirty() {

  dirty =
    true;
}

function saveDB(
  force = false
) {

  if (
    !force &&
    !dirty
  ) {

    return;
  }

  try {

    const tmp =
      dbPath +
      '.tmp';

    fs.writeFileSync(
      tmp,
      JSON.stringify(
        db,
        null,
        2
      ),
      'utf8'
    );

    fs.renameSync(
      tmp,
      dbPath
    );

    dirty =
      false;

  } catch (e) {

    console.error(
      'DB save error:',
      e.message
    );
  }
}

setInterval(
  () =>
    saveDB(false),
  SAVE_INTERVAL_MS
);

// ============================================================
// BASIC HELPERS
// ============================================================

function now() {

  return Date.now();
}

function safeString(
  value,
  max = 200
) {

  if (
    value ===
      undefined ||
    value ===
      null
  ) {

    return null;
  }

  return String(value)
    .slice(
      0,
      max
    );
}

function safeUserId(
  value
) {

  const id =
    String(
      value || ''
    )
      .trim();

  if (
    !/^\d+$/.test(
      id
    )
  ) {

    return null;
  }

  return id.slice(
    0,
    32
  );
}

function hashIp(
  ip
) {

  if (!ip) {

    return 'unknown';
  }

  return crypto
    .createHash(
      'sha256'
    )
    .update(
      String(ip) +
      SESSION_SECRET
    )
    .digest('hex')
    .slice(
      0,
      16
    );
}

function genId() {

  return crypto
    .randomBytes(
      24
    )
    .toString('hex');
}

function genSessionId() {

  return (
    'ps_' +
    crypto
      .randomBytes(
        18
      )
      .toString('hex')
  );
}

// ============================================================
// COOKIES / AUTH
// ============================================================

function parseCookies(
  header
) {

  const out =
    {};

  if (!header) {

    return out;
  }

  header
    .split(';')
    .forEach(
      part => {

        const [
          key,
          ...rest
        ] =
          part
            .trim()
            .split('=');

        if (!key) {

          return;
        }

        out[key] =
          decodeURIComponent(
            rest.join('=')
          );
      }
    );

  return out;
}

function getClientIp(
  req
) {

  return (
    (
      req.headers[
        'x-forwarded-for'
      ] ||
      ''
    )
      .split(',')[0]
      .trim()
    ||
    req.headers[
      'x-real-ip'
    ]
    ||
    req.socket.remoteAddress
    ||
    ''
  );
}

function cleanSessions() {

  const timestamp =
    now();

  for (
    const id of Object.keys(
      db.sessions
    )
  ) {

    if (
      db.sessions[id]
        .expiresAt <
      timestamp
    ) {

      delete db.sessions[id];

      markDirty();
    }
  }
}

function isAuth(
  req
) {

  const cookies =
    parseCookies(
      req.headers.cookie
    );

  const sid =
    cookies.session;

  if (!sid) {

    return false;
  }

  cleanSessions();

  const session =
    db.sessions[sid];

  return !!(
    session &&
    session.expiresAt >
      now()
  );
}

function createSession() {

  const sid =
    genId();

  const timestamp =
    now();

  db.sessions[sid] = {

    createdAt:
      timestamp,

    expiresAt:
      timestamp +
      SESSION_MAX_AGE_MS
  };

  markDirty();

  saveDB(true);

  return sid;
}

function destroySession(
  sid
) {

  if (
    sid &&
    db.sessions[sid]
  ) {

    delete db.sessions[sid];

    markDirty();

    saveDB(true);
  }
}

// ============================================================
// BRAIN SECRET
// ============================================================

function getBrainSecret(
  req
) {

  return (
    req.headers[
      'x-brain-secret'
    ]
    ||
    (
      req.headers.authorization ||
      ''
    ).replace(
      /^Bearer\s+/i,
      ''
    )
  );
}

function verifyBrain(
  req
) {

  return (
    getBrainSecret(req) ===
    BRAIN_API_SECRET
  );
}

// ============================================================
// RATE LIMIT
// ============================================================

function checkRate(
  ipHash
) {

  const timestamp =
    now();

  const row =
    db.loginAttempts[
      ipHash
    ];

  if (!row) {

    return {
      ok: true
    };
  }

  if (
    timestamp -
      row.last >
    15 * 60 * 1000
  ) {

    delete db.loginAttempts[
      ipHash
    ];

    markDirty();

    return {
      ok: true
    };
  }

  if (
    row.count >=
    5
  ) {

    return {

      ok: false,

      retry:
        Math.ceil(
          (
            15 * 60 * 1000 -
            (
              timestamp -
              row.last
            )
          ) /
          1000
        )
    };
  }

  return {
    ok: true
  };
}

function failLogin(
  ipHash
) {

  const timestamp =
    now();

  if (
    db.loginAttempts[
      ipHash
    ]
  ) {

    db.loginAttempts[
      ipHash
    ].count++;

    db.loginAttempts[
      ipHash
    ].last =
      timestamp;

  } else {

    db.loginAttempts[
      ipHash
    ] = {

      count:
        1,

      last:
        timestamp
    };
  }

  markDirty();

  saveDB(true);
}

function clearFail(
  ipHash
) {

  if (
    db.loginAttempts[
      ipHash
    ]
  ) {

    delete db.loginAttempts[
      ipHash
    ];

    markDirty();

    saveDB(true);
  }
}

// ============================================================
// SKILLS
// ============================================================

function parseSkills(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .map(
        x =>
          String(x)
            .slice(
              0,
              80
            )
      )
      .slice(
        0,
        50
      );
  }

  if (
    typeof value ===
    'string'
  ) {

    try {

      const parsed =
        JSON.parse(
          value
        );

      if (
        Array.isArray(
          parsed
        )
      ) {

        return parsed
          .map(
            x =>
              String(x)
                .slice(
                  0,
                  80
                )
          )
          .slice(
            0,
            50
          );
      }

    } catch {}
  }

  return [];
}

// ============================================================
// JSON
// ============================================================

function json(
  res,
  status,
  data,
  extraHeaders = {}
) {

  const body =
    JSON.stringify(
      data
    );

  res.writeHead(
    status,
    {

      'Content-Type':
        'application/json; charset=utf-8',

      'Content-Length':
        Buffer.byteLength(
          body
        ),

      ...extraHeaders
    }
  );

  res.end(
    body
  );
}

// ============================================================
// REQUEST BODY
// ============================================================

function readBody(
  req
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      let data =
        '';

      req.on(
        'data',
        chunk => {

          data +=
            chunk;

          if (
            data.length >
            65536
          ) {

            reject(
              new Error(
                'Body too large'
              )
            );

            req.destroy();
          }
        }
      );

      req.on(
        'end',
        () => {

          if (!data) {

            resolve({});

            return;
          }

          try {

            resolve(
              JSON.parse(
                data
              )
            );

          } catch {

            resolve({});
          }
        }
      );

      req.on(
        'error',
        reject
      );
    }
  );
}

// ============================================================
// ASTRA BRAIN V6 — COLLECTIVE INTELLIGENCE ENGINE
// ============================================================

function ensureLearningStores() {

  if (
    !db.games ||
    typeof db.games !==
      'object'
  ) {

    db.games = {};
  }

  if (
    !db.knowledge ||
    typeof db.knowledge !==
      'object'
  ) {

    db.knowledge = {};
  }

  if (
    !Array.isArray(
      db.learningEvents
    )
  ) {

    db.learningEvents =
      [];
  }
}

// ============================================================
// GAME NORMALIZATION
// ============================================================

function normalizeLearningGame(
  input
) {

  if (
    !input ||
    typeof input !==
      'object'
  ) {

    return null;
  }

  const game =
    input.game &&
    typeof input.game ===
      'object'
      ? input.game
      : input;

  const name =
    safeString(
      game.name ||
      game.gameName ||
      'Unknown Game',
      200
    );

  const placeId =
    safeString(
      game.placeId ||
      game.placeID ||
      '',
      64
    );

  const universeId =
    safeString(
      game.universeId ||
      game.universeID ||
      '',
      64
    );

  const jobId =
    safeString(
      game.jobId ||
      game.jobID ||
      '',
      120
    );

  const description =
    safeString(
      game.description,
      10000
    );

  const iconUrl =
    safeString(
      game.iconUrl,
      2000
    );

  const thumbnailUrl =
    safeString(
      game.thumbnailUrl,
      2000
    );

  if (
    !name &&
    !placeId &&
    !universeId
  ) {

    return null;
  }

  return {

    name:
      name ||
      'Unknown Game',

    placeId:
      placeId ||
      null,

    universeId:
      universeId ||
      null,

    jobId:
      jobId ||
      null,

    description:
      description ||
      null,

    iconUrl:
      iconUrl ||
      null,

    thumbnailUrl:
      thumbnailUrl ||
      null
  };
}

// ============================================================
// GAME KEY
// ============================================================

function getLearningGameKey(
  game
) {

  if (!game) {

    return null;
  }

  if (
    game.universeId
  ) {

    return (
      'universe:' +
      game.universeId
    );
  }

  if (
    game.placeId
  ) {

    return (
      'place:' +
      game.placeId
    );
  }

  const normalizedName =
    String(
      game.name ||
      'unknown'
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-|-$/g,
        ''
      )
      .slice(
        0,
        120
      );

  return (
    'name:' +
    (
      normalizedName ||
      'unknown'
    )
  );
}

// ============================================================
// ASTRA LANGUAGE LEARNING
// ============================================================

function ensureLanguageStores() {

  if (
    !db.languages ||
    typeof db.languages !== 'object'
  ) {
    db.languages = {};
  }

  if (
    !Array.isArray(
      db.languageObservations
    )
  ) {
    db.languageObservations = [];
  }
}

function normalizeLanguageUserId(value) {

  const id =
    safeUserId(value);

  return id || 'unknown';
}

function normalizeLanguage(value) {

  const text =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    text === 'vi' ||
    text === 'vn' ||
    text === 'vietnamese' ||
    text === 'tiếng việt'
  ) {
    return 'vi';
  }

  if (
    text === 'en' ||
    text === 'english'
  ) {
    return 'en';
  }

  if (
    text === 'zh' ||
    text === 'chinese'
  ) {
    return 'zh';
  }

  if (
    text === 'ja' ||
    text === 'japanese'
  ) {
    return 'ja';
  }

  if (
    text === 'ko' ||
    text === 'korean'
  ) {
    return 'ko';
  }

  return 'unknown';
}

function normalizeSlang(value) {

  const slang =
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );

  if (!slang) {
    return null;
  }

  return slang.slice(
    0,
    80
  );
}

function detectLanguageFromText(text) {

  const value =
    String(text || '')
      .toLowerCase();

  if (!value) {
    return 'unknown';
  }

  const vietnamese =
    (
      value.match(
        /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/g
      ) || []
    ).length;

  const englishWords =
    (
      value.match(
        /\b(the|and|you|your|this|that|what|why|how|bro|bruh|lol|game|play|win|lose|good|bad)\b/g
      ) || []
    ).length;

  if (
    vietnamese >= 2
  ) {
    return 'vi';
  }

  if (
    englishWords >= 1
  ) {
    return 'en';
  }

  return 'unknown';
}

function getLanguageProfile(
  userId
) {

  ensureLanguageStores();

  const id =
    normalizeLanguageUserId(
      userId
    );

  if (
    !db.languages[id]
  ) {

    db.languages[id] = {

      userId:
        id,

      languages: {},

      slang: {},

      firstSeen:
        now(),

      lastSeen:
        now(),

      observationCount:
        0
    };
  }

  return db.languages[id];
}

function observeLanguage(
  input
) {

  ensureLanguageStores();

  if (
    !input ||
    typeof input !== 'object'
  ) {
    throw new Error(
      'Invalid language observation'
    );
  }

  const userId =
    normalizeLanguageUserId(
      input.userId
    );

  const text =
    safeString(
      input.text ||
      input.message ||
      '',
      500
    );

  const language =
    normalizeLanguage(
      input.language ||
      detectLanguageFromText(
        text
      )
    );

  const slang =
    normalizeSlang(
      input.slang ||
      input.term
    );

  const timestamp =
    now();

  const profile =
    getLanguageProfile(
      userId
    );

  profile.lastSeen =
    timestamp;

  profile.observationCount++;

  if (
    !profile.languages[
      language
    ]
  ) {
    profile.languages[
      language
    ] = {

      count: 0,

      firstSeen:
        timestamp,

      lastSeen:
        timestamp
    };
  }

  profile.languages[
    language
  ].count++;

  profile.languages[
    language
  ].lastSeen =
    timestamp;

  let slangResult =
    null;

  if (slang) {

    if (
      !profile.slang[
        slang
      ]
    ) {

      profile.slang[
        slang
      ] = {

        count: 0,

        firstSeen:
          timestamp,

        lastSeen:
          timestamp,

        confidence:
          0,

        status:
          'candidate'
      };
    }

    const entry =
      profile.slang[
        slang
      ];

    entry.count++;

    entry.lastSeen =
      timestamp;

    /*
     * Evidence-based learning.
     *
     * 1      = candidate
     * 2-4    = possible
     * 5-9    = learned
     * 10+    = strong
     */

    if (
      entry.count >= 10
    ) {

      entry.status =
        'strong';

      entry.confidence =
        0.95;

    } else if (
      entry.count >= 5
    ) {

      entry.status =
        'learned';

      entry.confidence =
        0.80;

    } else if (
      entry.count >= 2
    ) {

      entry.status =
        'possible';

      entry.confidence =
        0.50;

    } else {

      entry.status =
        'candidate';

      entry.confidence =
        0.20;
    }

    slangResult = {

      term:
        slang,

      count:
        entry.count,

      status:
        entry.status,

      confidence:
        entry.confidence
    };
  }

  db.languageObservations.push({

    id:
      genId(),

    userId:
      userId,

    language:
      language,

    slang:
      slang,

    timestamp:
      timestamp
  });

  if (
    db.languageObservations.length >
    5000
  ) {

    db.languageObservations =
      db.languageObservations.slice(
        -5000
      );
  }

  markDirty();

  return {

    success:
      true,

    userId:
      userId,

    language:
      language,

    slang:
      slangResult
  };
}

function getLanguageDashboard() {

  ensureLanguageStores();

  const users =
    Object.values(
      db.languages
    );

  const slangMap =
    {};

  let languageCounts =
    {};

  for (
    const profile of users
  ) {

    for (
      const [
        language,
        data
      ] of Object.entries(
        profile.languages ||
        {}
      )
    ) {

      languageCounts[
        language
      ] =
        (
          languageCounts[
            language
          ] || 0
        ) +
        Number(
          data.count || 0
        );
    }

    for (
      const [
        term,
        data
      ] of Object.entries(
        profile.slang ||
        {}
      )
    ) {

      if (
        !slangMap[
          term
        ]
      ) {

        slangMap[
          term
        ] = {

          term:
            term,

          count:
            0,

          confidence:
            0,

          status:
            'candidate'
        };
      }

      slangMap[
        term
      ].count +=
        Number(
          data.count || 0
        );

      slangMap[
        term
      ].confidence =
        Math.max(
          slangMap[
            term
          ].confidence,
          Number(
            data.confidence || 0
          )
        );

      if (
        Number(
          data.confidence || 0
        ) >=
        slangMap[
          term
        ].confidence
      ) {

        slangMap[
          term
        ].status =
          data.status ||
          'candidate';
      }
    }
  }

  return {

    success:
      true,

    totals: {

      users:
        users.length,

      observations:
        db.languageObservations.length,

      languages:
        Object.keys(
          languageCounts
        ).length,

      slang:
        Object.keys(
          slangMap
        ).length
    },

    languages:
      Object.entries(
        languageCounts
      )
        .map(
          ([
            language,
            count
          ]) => ({
            language,
            count
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        ),

    slang:
      Object.values(
        slangMap
      )
        .sort(
          (a, b) =>
            b.count -
            a.count
        )
        .slice(
          0,
          200
        )
  };
}

// ============================================================
// ROBLOX API FETCH
// ============================================================

async function fetchJsonWithTimeout(
  url,
  timeoutMs =
    ROBLOX_GAME_METADATA_TIMEOUT_MS
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  try {

    const response =
      await fetch(
        url,
        {

          headers: {

            Accept:
              'application/json'
          },

          signal:
            controller.signal
        }
      );

    if (
      !response.ok
    ) {

      throw new Error(
        `Roblox API HTTP ${response.status}`
      );
    }

    return await response.json();

  } finally {

    clearTimeout(
      timer
    );
  }
}

// ============================================================
// RESOLVE UNIVERSE FROM PLACE
// ============================================================

async function resolveUniverseIdFromPlaceId(
  placeId
) {

  if (!placeId) {

    return null;
  }

  const data =
    await fetchJsonWithTimeout(
      `https://apis.roblox.com/universes/v1/places/${encodeURIComponent(
        placeId
      )}/universe`
    );

  return data &&
    data.universeId
    ? String(
        data.universeId
      )
    : null;
}

// ============================================================
// FETCH ROBLOX GAME METADATA
// ============================================================

async function fetchRobloxGameMetadata(
  game
) {

  let universeId =
    game &&
    game.universeId
      ? String(
          game.universeId
        )
      : null;

  if (
    !universeId &&
    game &&
    game.placeId
  ) {

    try {

      universeId =
        await resolveUniverseIdFromPlaceId(
          String(
            game.placeId
          )
        );

    } catch (e) {

      console.error(
        'Roblox universe resolve error:',
        e.message
      );
    }
  }

  if (!universeId) {

    return null;
  }

  let info =
    null;

  let iconUrl =
    null;

  let thumbnailUrl =
    null;

  // ==========================================================
  // GAME INFORMATION
  // ==========================================================

  try {

    const data =
      await fetchJsonWithTimeout(
        `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(
          universeId
        )}`
      );

    info =
      Array.isArray(
        data &&
        data.data
      )
        ? data.data[0]
        : null;

  } catch (e) {

    console.error(
      'Roblox game metadata error:',
      e.message
    );
  }

  // ==========================================================
  // GAME ICON
  // ==========================================================

  try {

    const data =
      await fetchJsonWithTimeout(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(
          universeId
        )}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
      );

    iconUrl =
      data &&
      Array.isArray(
        data.data
      )
        ? data.data[0]?.imageUrl ||
          null
        : null;

  } catch (e) {

    console.error(
      'Roblox game icon error:',
      e.message
    );
  }

  // ==========================================================
  // GAME THUMBNAIL
  // ==========================================================

  try {

    const data =
      await fetchJsonWithTimeout(
        `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${encodeURIComponent(
          universeId
        )}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`
      );

    const first =
      Array.isArray(
        data &&
        data.data
      )
        ? data.data[0]
        : null;

    if (
      first &&
      Array.isArray(
        first.thumbnails
      ) &&
      first.thumbnails.length
    ) {

      thumbnailUrl =
        first.thumbnails[0]
          ?.imageUrl ||
        null;
    }

  } catch (e) {

    console.error(
      'Roblox game thumbnail error:',
      e.message
    );
  }

  return {

    universeId,

    name:
      safeString(
        info?.name ||
        game?.name,
        200
      ),

    description:
      safeString(
        info?.description,
        10000
      ),

    rootPlaceId:
      info?.rootPlaceId
        ? String(
            info.rootPlaceId
          )
        : safeString(
            game?.placeId,
            64
          ),

    iconUrl:
      safeString(
        iconUrl,
        2000
      ),

    thumbnailUrl:
      safeString(
        thumbnailUrl,
        2000
      ),

    fetchedAt:
      now()
  };
}

// ============================================================
// QUEUE GAME METADATA REFRESH
// ============================================================

function queueGameMetadataRefresh(
  record
) {

  if (!record) {

    return;
  }

  if (
    record.metadataRefreshing
  ) {

    return;
  }

  const fetchedAt =
    Number(
      record.metadataFetchedAt ||
      0
    );

  if (
    fetchedAt &&
    now() -
      fetchedAt <
      ROBLOX_GAME_METADATA_TTL_MS
  ) {

    return;
  }

  record.metadataRefreshing =
    true;

  fetchRobloxGameMetadata(
    record
  )
    .then(
      metadata => {

        if (!metadata) {

          return;
        }

        if (
          metadata.name
        ) {

          record.name =
            metadata.name;
        }

        if (
          metadata.rootPlaceId
        ) {

          record.placeId =
            metadata.rootPlaceId;
        }

        if (
          metadata.universeId
        ) {

          record.universeId =
            metadata.universeId;
        }

        if (
          metadata.description !==
          null
        ) {

          record.description =
            metadata.description;
        }

        if (
          metadata.iconUrl
        ) {

          record.iconUrl =
            metadata.iconUrl;
        }

        if (
          metadata.thumbnailUrl
        ) {

          record.thumbnailUrl =
            metadata.thumbnailUrl;
        }

        record.metadataFetchedAt =
          metadata.fetchedAt;

        markDirty();
      }
    )
    .catch(
      error => {

        console.error(
          'Roblox game metadata refresh error:',
          error.message
        );

        /*
         * Prevent immediate repeated
         * requests when Roblox is unavailable.
         */

        record.metadataFetchedAt =
          now();

        markDirty();
      }
    )
    .finally(
      () => {

        record.metadataRefreshing =
          false;
      }
    );
}

// ============================================================
// GAME RECORD
// ============================================================

function recordGameVisit(
  gameInput,
  brainId = null,
  userId = null
) {

  ensureLearningStores();

  const game =
    normalizeLearningGame(
      gameInput
    );

  if (!game) {

    return null;
  }

  const gameKey =
    getLearningGameKey(
      game
    );

  if (!gameKey) {

    return null;
  }

  const timestamp =
    now();

  let record =
    db.games[
      gameKey
    ];

  if (!record) {

    record = {

      gameKey,

      name:
        game.name,

      placeId:
        game.placeId,

      universeId:
        game.universeId,

      // ======================================================
      // GAME METADATA
      // ======================================================

      description:
        game.description ||
        null,

      iconUrl:
        game.iconUrl ||
        null,

      thumbnailUrl:
        game.thumbnailUrl ||
        null,

      metadataFetchedAt:
        0,

      metadataRefreshing:
        false,

      firstSeen:
        timestamp,

      lastSeen:
        timestamp,

      totalVisits:
        0,

      brainIds:
        [],

      userIds:
        [],

      observations:
        0,

      verifiedKnowledgeCount:
        0,

      candidateKnowledgeCount:
        0
    };

    db.games[
      gameKey
    ] = record;
  }

  if (
    game.name
  ) {

    record.name =
      game.name;
  }

  if (
    game.placeId
  ) {

    record.placeId =
      game.placeId;
  }

  if (
    game.universeId
  ) {

    record.universeId =
      game.universeId;
  }

  /*
   * Client-provided metadata can be
   * preserved, but Roblox metadata is
   * preferred when available.
   */

  if (
    game.description
  ) {

    record.description =
      game.description;
  }

  if (
    game.iconUrl
  ) {

    record.iconUrl =
      game.iconUrl;
  }

  if (
    game.thumbnailUrl
  ) {

    record.thumbnailUrl =
      game.thumbnailUrl;
  }

  record.lastSeen =
    timestamp;

  record.totalVisits =
    Number(
      record.totalVisits ||
      0
    ) + 1;

  if (
    brainId
  ) {

    const id =
      String(
        brainId
      );

    if (
      !Array.isArray(
        record.brainIds
      )
    ) {

      record.brainIds =
        [];
    }

    if (
      !record.brainIds.includes(
        id
      )
    ) {

      record.brainIds.push(
        id
      );
    }
  }

  if (
    userId
  ) {

    const id =
      String(
        userId
      );

    if (
      !Array.isArray(
        record.userIds
      )
    ) {

      record.userIds =
        [];
    }

    if (
      !record.userIds.includes(
        id
      )
    ) {

      record.userIds.push(
        id
      );
    }
  }

  markDirty();

  /*
   * Fetch Roblox description,
   * icon and thumbnail in the
   * background.
   */

  queueGameMetadataRefresh(
    record
  );

  return record;
}

// ============================================================
// KNOWLEDGE NORMALIZATION
// ============================================================

function normalizeLearningKnowledge(
  body
) {

  if (
    !body ||
    typeof body !==
      'object'
  ) {

    throw new Error(
      'Invalid knowledge payload'
    );
  }

  const game =
    normalizeLearningGame(
      body.game
    );

  const topic =
    safeString(
      body.topic,
      300
    );

  const lesson =
    safeString(
      body.lesson ||
      body.observation ||
      body.knowledge,
      5000
    );

  if (!topic) {

    throw new Error(
      'topic is required'
    );
  }

  if (!lesson) {

    throw new Error(
      'lesson is required'
    );
  }

  let confidence =
    Number(
      body.confidence
    );

  if (
    !Number.isFinite(
      confidence
    )
  ) {

    confidence =
      0;
  }

  confidence =
    Math.max(
      0,
      Math.min(
        1,
        confidence
      )
    );

  let evidenceCount =
    Number(
      body.evidenceCount
    );

  if (
    !Number.isFinite(
      evidenceCount
    )
  ) {

    evidenceCount =
      1;
  }

  evidenceCount =
    Math.max(
      0,
      Math.min(
        1000,
        Math.floor(
          evidenceCount
        )
      )
    );

  const visibility =
    body.visibility ===
    'personal'
      ? 'personal'
      : body.visibility ===
        'system'
        ? 'system'
        : 'shared';

  /*
   * SECURITY:
   *
   * Client cannot simply send:
   *
   * verified: true
   *
   * and make weak knowledge trusted.
   *
   * Astra requires:
   *
   * confidence >= 0.85
   * evidenceCount >= 2
   */

  const verified =
    body.verified ===
      true &&
    confidence >=
      0.85 &&
    evidenceCount >=
      2;

  const id =
    safeString(
      body.id ||
      (
        'knowledge_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .slice(
            2,
            9
          )
      ),
      150
    );

  return {

    id,

    game:
      body.game &&
      typeof body.game ===
        'object'
        ? {

            name:
              safeString(
                body.game.name,
                200
              ),

            placeId:
              safeString(
                body.game.placeId,
                64
              ),

            universeId:
              safeString(
                body.game.universeId,
                64
              ),

            jobId:
              safeString(
                body.game.jobId,
                100
              ),

            description:
              safeString(
                body.game.description,
                10000
              ),

            iconUrl:
              safeString(
                body.game.iconUrl,
                2000
              ),

            thumbnailUrl:
              safeString(
                body.game.thumbnailUrl,
                2000
              )
          }
        : null,

    topic,

    lesson,

    confidence,

    evidenceCount,

    visibility,

    verified,

    source:
      'generalized',

    createdAt:
      Number(
        body.createdAt
      ) ||
      now(),

    updatedAt:
      now()
  };
}

// ============================================================
// SUBMIT KNOWLEDGE
// ============================================================

function submitLearningKnowledge(
  body
) {

  ensureLearningStores();

  const item =
    normalizeLearningKnowledge(
      body
    );

  item.sourceBrainId =
    body.brainId
      ? safeString(
          body.brainId,
          100
        )
      : null;

  item.sourceUserId =
    body.userId
      ? safeUserId(
          body.userId
        )
      : null;

  const existing =
    db.knowledge[
      item.id
    ];

  if (existing) {

    existing.topic =
      item.topic;

    existing.lesson =
      item.lesson;

    existing.game =
      item.game;

    existing.confidence =
      Math.max(
        Number(
          existing.confidence ||
          0
        ),
        item.confidence
      );

    existing.evidenceCount =
      Math.max(
        Number(
          existing.evidenceCount ||
          0
        ),
        item.evidenceCount
      );

    existing.visibility =
      item.visibility;

    existing.verified =
      item.verified;

    existing.updatedAt =
      item.updatedAt;

  } else {

    db.knowledge[
      item.id
    ] = item;
  }

  let game =
    null;

  if (
    item.game
  ) {

    game =
      recordGameVisit(
        item.game,
        item.sourceBrainId,
        item.sourceUserId
      );

    if (game) {

      game.observations =
        Number(
          game.observations ||
          0
        ) + 1;

      if (
        item.verified
      ) {

        game.verifiedKnowledgeCount =
          Number(
            game.verifiedKnowledgeCount ||
            0
          ) + 1;

      } else {

        game.candidateKnowledgeCount =
          Number(
            game.candidateKnowledgeCount ||
            0
          ) + 1;
      }
    }
  }

  db.learningEvents.push({

    id:
      'learning_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(
          2,
          8
        ),

    type:
      item.verified
        ? 'verified_knowledge'
        : 'candidate_knowledge',

    gameKey:
      game
        ? game.gameKey
        : null,

    topic:
      item.topic,

    confidence:
      item.confidence,

    evidenceCount:
      item.evidenceCount,

    visibility:
      item.visibility,

    verified:
      item.verified,

    createdAt:
      now()
  });

  if (
    db.learningEvents.length >
    5000
  ) {

    db.learningEvents =
      db.learningEvents.slice(
        -5000
      );
  }

  markDirty();

  return {

    success:
      true,

    knowledge: {

      id:
        item.id,

      topic:
        item.topic,

      lesson:
        item.lesson,

      game:
        item.game,

      confidence:
        item.confidence,

      evidenceCount:
        item.evidenceCount,

      visibility:
        item.visibility,

      verified:
        item.verified,

      createdAt:
        item.createdAt,

      updatedAt:
        item.updatedAt
    }
  };
}

// ============================================================
// SHARED KNOWLEDGE QUERY
// ============================================================

function getSharedLearningKnowledge(
  options = {}
) {

  ensureLearningStores();

  const query =
    String(
      options.q ||
      ''
    )
      .toLowerCase()
      .trim();

  const gameKey =
    String(
      options.gameKey ||
      ''
    )
      .trim();

  let list =
    Object.values(
      db.knowledge
    );

  /*
   * Personal knowledge never enters
   * the collective knowledge result.
   */

  list =
    list.filter(
      item =>
        item.visibility !==
        'personal'
    );

  /*
   * Shared knowledge requires verification.
   * System knowledge can be returned directly.
   */

  list =
    list.filter(
      item =>
        item.verified ===
          true ||
        item.visibility ===
          'system'
    );

  if (query) {

    list =
      list.filter(
        item => {

          const text =
            [
              item.topic,
              item.lesson,
              item.game?.name
            ]
              .join(' ')
              .toLowerCase();

          return text.includes(
            query
          );
        }
      );
  }

  if (gameKey) {

    list =
      list.filter(
        item =>
          getLearningGameKey(
            item.game
          ) ===
          gameKey
      );
  }

  list.sort(
    (a, b) =>
      Number(
        b.updatedAt ||
        0
      ) -
      Number(
        a.updatedAt ||
        0
      )
  );

  return list.map(
    item => ({

      id:
        item.id,

      topic:
        item.topic,

      lesson:
        item.lesson,

      game:
        item.game ||
        null,

      confidence:
        Number(
          item.confidence ||
          0
        ),

      evidenceCount:
        Number(
          item.evidenceCount ||
          0
        ),

      visibility:
        item.visibility,

      verified:
        item.verified ===
        true,

      createdAt:
        item.createdAt ||
        null,

      updatedAt:
        item.updatedAt ||
        null
    })
  );
}

// ============================================================
// GAME LEARNING SCORE
// ============================================================

function calculateGameLearningScore(
  gameKey
) {

  const knowledge =
    Object.values(
      db.knowledge
    )
      .filter(
        item =>
          item.visibility !==
          'personal'
      )
      .filter(
        item =>
          item.verified ===
          true
      )
      .filter(
        item =>
          getLearningGameKey(
            item.game
          ) ===
          gameKey
      );

  const topics =
    new Set();

  for (
    const item of knowledge
  ) {

    const topic =
      String(
        item.topic ||
        ''
      )
        .trim()
        .toLowerCase();

    if (topic) {

      topics.add(
        topic
      );
    }
  }

  /*
   * Transparent dashboard metric.
   *
   * This does NOT mean:
   * "Astra understands X% of the game."
   *
   * It measures breadth of verified topics.
   */

  return Math.min(
    100,
    topics.size * 10
  );
}

// ============================================================
// DASHBOARD GAME SUMMARY
// ============================================================

function buildLearningGameSummary(
  game
) {

  const verifiedKnowledge =
    Object.values(
      db.knowledge
    )
      .filter(
        item =>
          item.visibility !==
          'personal'
      )
      .filter(
        item =>
          item.verified ===
          true
      )
      .filter(
        item =>
          getLearningGameKey(
            item.game
          ) ===
          game.gameKey
      );

  const learningScore =
    calculateGameLearningScore(
      game.gameKey
    );

  let learningStatus =
    'discovered';

  if (
    verifiedKnowledge.length >
    0
  ) {

    learningStatus =
      learningScore >=
        80
        ? 'well-learned'
        : 'learning';
  }

  return {

    gameKey:
      game.gameKey,

    name:
      game.name,

    placeId:
      game.placeId,

    universeId:
      game.universeId,

    // ========================================================
    // GAME DESCRIPTION + IMAGES
    // ========================================================

    description:
      game.description ||
      null,

    iconUrl:
      game.iconUrl ||
      null,

    thumbnailUrl:
      game.thumbnailUrl ||
      null,

    metadataFetchedAt:
      game.metadataFetchedAt ||
      null,

    firstSeen:
      game.firstSeen,

    lastSeen:
      game.lastSeen,

    totalVisits:
      Number(
        game.totalVisits ||
        0
      ),

    brainCount:
      Array.isArray(
        game.brainIds
      )
        ? game.brainIds.length
        : 0,

    playerCount:
      Array.isArray(
        game.userIds
      )
        ? game.userIds.length
        : 0,

    observations:
      Number(
        game.observations ||
        0
      ),

    verifiedKnowledgeCount:
      verifiedKnowledge.length,

    candidateKnowledgeCount:
      Number(
        game.candidateKnowledgeCount ||
        0
      ),

    learningScore,

    learningStatus
  };
}

// ============================================================
// DASHBOARD GAMES
// ============================================================

function getDashboardGames() {

  ensureLearningStores();

  return Object.values(
    db.games
  )
    .map(
      buildLearningGameSummary
    )
    .sort(
      (a, b) =>
        Number(
          b.lastSeen ||
          0
        ) -
        Number(
          a.lastSeen ||
          0
        )
    );
}

// ============================================================
// DASHBOARD LEARNING SUMMARY
// ============================================================

function getDashboardLearningSummary() {

  ensureLearningStores();

  const games =
    getDashboardGames();

  const knowledge =
    getSharedLearningKnowledge();

  const candidateKnowledge =
    Object.values(
      db.knowledge
    )
      .filter(
        item =>
          item.visibility !==
          'personal'
      )
      .filter(
        item =>
          item.verified !==
          true
      )
      .length;

  const personalKnowledge =
    Object.values(
      db.knowledge
    )
      .filter(
        item =>
          item.visibility ===
          'personal'
      )
      .length;

  return {

    totals: {

      brains:
        Object.keys(
          db.brains ||
          {}
        ).length,

      players:
        Object.keys(
          db.players ||
          {}
        ).length,

      games:
        games.length,

      knowledge:
        knowledge.length,

      verifiedKnowledge:
        knowledge.length,

      candidateKnowledge,

      personalKnowledge,

      learningEvents:
        db.learningEvents.length
    },

    games,

    knowledge:
      knowledge.slice(
        0,
        200
      )
  };
}

// ============================================================
// STATIC FILES
// ============================================================

function serveStatic(
  req,
  res,
  filePath
) {

  const ext =
    path
      .extname(
        filePath
      )
      .toLowerCase();

  const types = {

    '.html':
      'text/html; charset=utf-8',

    '.css':
      'text/css; charset=utf-8',

    '.js':
      'application/javascript; charset=utf-8',

    '.json':
      'application/json',

    '.png':
      'image/png',

    '.jpg':
      'image/jpeg',

    '.jpeg':
      'image/jpeg',

    '.webp':
      'image/webp',

    '.ico':
      'image/x-icon'
  };

  fs.readFile(
    filePath,
    (
      err,
      content
    ) => {

      if (err) {

        res.writeHead(
          404
        );

        res.end(
          'Not found'
        );

        return;
      }

      res.writeHead(
        200,
        {

          'Content-Type':
            types[ext] ||
            'application/octet-stream'
        }
      );

      res.end(
        content
      );
    }
  );
}

// ============================================================
// HISTORY HELPERS
// ============================================================

function findHistoryValue(
  list,
  value
) {

  return list.find(
    item =>
      item.value ===
      value
  );
}

function rememberHistory(
  list,
  value,
  timestamp
) {

  if (!value) {

    return false;
  }

  const existing =
    findHistoryValue(
      list,
      value
    );

  if (existing) {

    existing.lastSeen =
      timestamp;

    return false;
  }

  list.push({

    value,

    firstSeen:
      timestamp,

    lastSeen:
      timestamp
  });

  return true;
}

function rememberAvatar(
  player,
  avatar,
  timestamp
) {

  if (!avatar) {

    return false;
  }

  const imageUrl =
    safeString(
      avatar.imageUrl,
      1000
    );

  const fingerprint =
    safeString(
      avatar.fingerprint,
      200
    );

  if (
    !imageUrl &&
    !fingerprint
  ) {

    return false;
  }

  const existing =
    player.avatarHistory.find(
      item =>
        (
          fingerprint &&
          item.fingerprint ===
          fingerprint
        )
        ||
        (
          imageUrl &&
          item.imageUrl ===
          imageUrl
        )
    );

  if (existing) {

    existing.lastSeen =
      timestamp;

    if (
      imageUrl &&
      !existing.imageUrl
    ) {

      existing.imageUrl =
        imageUrl;
    }

    return false;
  }

  player.avatarHistory.push({

    fingerprint:
      fingerprint ||
      null,

    imageUrl:
      imageUrl ||
      null,

    firstSeen:
      timestamp,

    lastSeen:
      timestamp
  });

  return true;
}

// ============================================================
// DEVICE NORMALIZATION
// ============================================================

const DEVICE_TYPES = [

  'mobile',

  'tablet',

  'computer',

  'console',

  'unknown'
];

function normalizeDevice(
  value
) {

  const device =
    String(
      value || ''
    )
      .toLowerCase()
      .trim();

  if (
    DEVICE_TYPES.includes(
      device
    )
  ) {

    return device;
  }

  return 'unknown';
}

function ensureDevice(
  player,
  device
) {

  device =
    normalizeDevice(
      device
    );

  if (
    !player.devices[
      device
    ]
  ) {

    player.devices[
      device
    ] = {

      sessions:
        0,

      playTimeMs:
        0,

      firstSeen:
        null,

      lastSeen:
        null
    };
  }

  return player.devices[
    device
  ];
}

// ============================================================
// PLAYER OBJECT
// ============================================================

function createPlayer(
  userId,
  timestamp
) {

  return {

    userId,

    current: {

      username:
        null,

      displayName:
        null,

      avatar:
        null
    },

    /*
     * IMPORTANT:
     *
     * This is the PLAYER'S description.
     * It is completely separate from
     * game.description.
     */

    description:
      null,

    usernameHistory:
      [],

    displayNameHistory:
      [],

    avatarHistory:
      [],

    devices: {

      mobile: {

        sessions:
          0,

        playTimeMs:
          0,

        firstSeen:
          null,

        lastSeen:
          null
      },

      tablet: {

        sessions:
          0,

        playTimeMs:
          0,

        firstSeen:
          null,

        lastSeen:
          null
      },

      computer: {

        sessions:
          0,

        playTimeMs:
          0,

        firstSeen:
          null,

        lastSeen:
          null
      },

      console: {

        sessions:
          0,

        playTimeMs:
          0,

        firstSeen:
          null,

        lastSeen:
          null
      },

      unknown: {

        sessions:
          0,

        playTimeMs:
          0,

        firstSeen:
          null,

        lastSeen:
          null
      }
    },

    countryHistory:
      [],

    sessions:
      0,

    playTimeMs:
      0,

    firstSeen:
      timestamp,

    lastSeen:
      timestamp,

    lastBrainId:
      null,

    lastGame:
      null,

    lastPlaceId:
      null,

    lastJobId:
      null
  };
}

function getPlayer(
  userId,
  timestamp
) {

  let player =
    db.players[
      userId
    ];

  if (!player) {

    player =
      createPlayer(
        userId,
        timestamp
      );

    db.players[
      userId
    ] =
      player;

    markDirty();

  } else {

    migratePlayer(
      player,
      userId,
      timestamp
    );
  }

  return player;
}

// ============================================================
// PLAYER MIGRATION
// ============================================================

function migratePlayer(
  player,
  userId,
  timestamp
) {

  player.userId =
    userId;

  if (!player.current) {

    player.current =
      {};
  }

  /*
   * Migration for old players.
   *
   * Old players did not have
   * a player description.
   */

  if (
    player.description ===
      undefined
  ) {

    player.description =
      null;
  }

  if (
    !Array.isArray(
      player.usernameHistory
    )
  ) {

    player.usernameHistory =
      [];
  }

  if (
    !Array.isArray(
      player.displayNameHistory
    )
  ) {

    player.displayNameHistory =
      [];
  }

  if (
    !Array.isArray(
      player.avatarHistory
    )
  ) {

    player.avatarHistory =
      [];
  }

  if (
    !Array.isArray(
      player.countryHistory
    )
  ) {

    player.countryHistory =
      [];
  }

  if (!player.devices) {

    player.devices =
      {};
  }

  for (
    const device of DEVICE_TYPES
  ) {

    ensureDevice(
      player,
      device
    );
  }

  if (
    typeof player.sessions !==
    'number'
  ) {

    player.sessions =
      0;
  }

  if (
    typeof player.playTimeMs !==
    'number'
  ) {

    player.playTimeMs =
      0;
  }

  if (!player.firstSeen) {

    player.firstSeen =
      timestamp;
  }

  if (!player.lastSeen) {

    player.lastSeen =
      timestamp;
  }
}

// ============================================================
// COUNTRY
// ============================================================

function rememberCountry(
  player,
  country,
  source,
  timestamp
) {

  if (!country) {

    return;
  }

  const code =
    safeString(
      country,
      16
    )
      .toUpperCase();

  if (!code) {

    return;
  }

  const existing =
    player.countryHistory.find(
      item =>
        item.code ===
        code
    );

  if (existing) {

    existing.lastSeen =
      timestamp;

    return;
  }

  player.countryHistory.push({

    code,

    source:
      safeString(
        source ||
        'client',
        50
      ),

    firstSeen:
      timestamp,

    lastSeen:
      timestamp
  });
}

// ============================================================
// PLAYER PROFILE UPDATE
// ============================================================

function updatePlayerProfile(
  body,
  brainId
) {

  const userId =
    safeUserId(
      body.userId
    );

  if (!userId) {

    throw new Error(
      'Invalid userId'
    );
  }

  const timestamp =
    now();

  const player =
    getPlayer(
      userId,
      timestamp
    );

  const username =
    safeString(
      body.username,
      100
    );

  const displayName =
    safeString(
      body.displayName,
      100
    );

  /*
   * PLAYER DESCRIPTION
   *
   * This is intentionally NOT
   * game.description.
   */

  if (
    body.description !==
      undefined
  ) {

    player.description =
      safeString(
        body.description,
        5000
      );
  }

  const device =
    normalizeDevice(
      body.device
    );

  if (username) {

    player.current.username =
      username;

    rememberHistory(
      player.usernameHistory,
      username,
      timestamp
    );
  }

  if (displayName) {

    player.current.displayName =
      displayName;

    rememberHistory(
      player.displayNameHistory,
      displayName,
      timestamp
    );
  }

  if (
    body.avatar &&
    typeof body.avatar ===
      'object'
  ) {

    rememberAvatar(
      player,
      body.avatar,
      timestamp
    );

    player.current.avatar = {

      fingerprint:
        safeString(
          body.avatar.fingerprint,
          200
        ),

      imageUrl:
        safeString(
          body.avatar.imageUrl,
          1000
        )
    };
  }

  rememberCountry(
    player,
    body.country,
    body.countrySource,
    timestamp
  );

  player.lastSeen =
    timestamp;

  player.lastBrainId =
    brainId ||
    player.lastBrainId;

  // ==========================================================
  // PLAYER LAST GAME
  // ==========================================================

  if (
    body.game &&
    typeof body.game ===
      'object'
  ) {

    player.lastGame =
      safeString(
        body.game.name,
        200
      );

    player.lastPlaceId =
      safeString(
        body.game.placeId,
        64
      );

    player.lastJobId =
      safeString(
        body.game.jobId,
        100
      );
  }

  // ==========================================================
  // ASTRA BRAIN V6 — RECORD GAME DISCOVERY
  // ==========================================================

  if (
    body.game &&
    typeof body.game ===
      'object'
  ) {

    recordGameVisit(
      body.game,
      brainId,
      userId
    );
  }

  const deviceStats =
    ensureDevice(
      player,
      device
    );

  if (
    !deviceStats.firstSeen
  ) {

    deviceStats.firstSeen =
      timestamp;
  }

  deviceStats.lastSeen =
    timestamp;

  markDirty();

  return player;
}

// ============================================================
// SESSION START
// ============================================================

function startPlayerSession(
  body
) {

  const userId =
    safeUserId(
      body.userId
    );

  if (!userId) {

    throw new Error(
      'Invalid userId'
    );
  }

  const timestamp =
    now();

  const player =
    updatePlayerProfile(
      body,
      body.brainId
    );

  const sessionId =
    safeString(
      body.sessionId,
      100
    ) ||
    genSessionId();

  let session =
    db.playerSessions[
      sessionId
    ];

  if (session) {

    session.lastSeen =
      timestamp;

    session.active =
      true;

    markDirty();

    return {

      player,

      session,

      created:
        false
    };
  }

  const device =
    normalizeDevice(
      body.device
    );

  session = {

    sessionId,

    userId,

    brainId:
      safeString(
        body.brainId,
        64
      ),

    device,

    startedAt:
      timestamp,

    lastSeen:
      timestamp,

    endedAt:
      null,

    playTimeMs:
      0,

    active:
      true,

    game:
      body.game &&
      typeof body.game ===
        'object'
        ? {

            name:
              safeString(
                body.game.name,
                200
              ),

            placeId:
              safeString(
                body.game.placeId,
                64
              ),

            universeId:
              safeString(
                body.game.universeId,
                64
              ),

            jobId:
              safeString(
                body.game.jobId,
                100
              )
          }
        : null
  };

  db.playerSessions[
    sessionId
  ] =
    session;

  player.sessions++;

  const deviceStats =
    ensureDevice(
      player,
      device
    );

  deviceStats.sessions++;

  player.lastSeen =
    timestamp;

  markDirty();

  return {

    player,

    session,

    created:
      true
  };
}

// ============================================================
// SESSION HEARTBEAT
// ============================================================

function heartbeatPlayerSession(
  body
) {

  const sessionId =
    safeString(
      body.sessionId,
      100
    );

  if (!sessionId) {

    throw new Error(
      'sessionId is required'
    );
  }

  const session =
    db.playerSessions[
      sessionId
    ];

  if (!session) {

    return {
      found: false
    };
  }

  const timestamp =
    now();

  let delta =
    timestamp -
    session.lastSeen;

  if (
    delta < 0 ||
    delta >
      PLAYER_SESSION_TIMEOUT_MS
  ) {

    delta =
      0;
  }

  session.playTimeMs +=
    delta;

  session.lastSeen =
    timestamp;

  session.active =
    true;

  const player =
    db.players[
      session.userId
    ];

  if (player) {

    player.playTimeMs +=
      delta;

    player.lastSeen =
      timestamp;

    const deviceStats =
      ensureDevice(
        player,
        session.device
      );

    deviceStats.playTimeMs +=
      delta;

    deviceStats.lastSeen =
      timestamp;
  }

  markDirty();

  return {

    found:
      true,

    session
  };
}

// ============================================================
// SESSION END
// ============================================================

function endPlayerSession(
  body
) {

  const sessionId =
    safeString(
      body.sessionId,
      100
    );

  if (!sessionId) {

    throw new Error(
      'sessionId is required'
    );
  }

  const session =
    db.playerSessions[
      sessionId
    ];

  if (!session) {

    return {
      found: false
    };
  }

  if (!session.active) {

    return {

      found:
        true,

      alreadyEnded:
        true,

      session
    };
  }

  const timestamp =
    now();

  let delta =
    timestamp -
    session.lastSeen;

  if (
    delta < 0 ||
    delta >
      PLAYER_SESSION_TIMEOUT_MS
  ) {

    delta =
      0;
  }

  session.playTimeMs +=
    delta;

  session.lastSeen =
    timestamp;

  session.endedAt =
    timestamp;

  session.active =
    false;

  const player =
    db.players[
      session.userId
    ];

  if (player) {

    player.playTimeMs +=
      delta;

    player.lastSeen =
      timestamp;

    const deviceStats =
      ensureDevice(
        player,
        session.device
      );

    deviceStats.playTimeMs +=
      delta;

    deviceStats.lastSeen =
      timestamp;
  }

  markDirty();

  return {

    found:
      true,

    session
  };
}

// ============================================================
// STALE SESSION CLEANUP
// ============================================================

function cleanPlayerSessions() {

  const timestamp =
    now();

  for (
    const id of Object.keys(
      db.playerSessions
    )
  ) {

    const session =
      db.playerSessions[id];

    if (
      !session.active
    ) {

      continue;
    }

    if (
      timestamp -
        session.lastSeen >
      PLAYER_SESSION_TIMEOUT_MS
    ) {

      const player =
        db.players[
          session.userId
        ];

      if (player) {

        /*
         * Heartbeats already accounted
         * for previous intervals.
         *
         * Only account for the final
         * stale interval.
         */

        const staleDelta =
          Math.min(
            PLAYER_SESSION_TIMEOUT_MS,
            Math.max(
              0,
              timestamp -
                session.lastSeen
            )
          );

        player.playTimeMs +=
          staleDelta;

        const deviceStats =
          ensureDevice(
            player,
            session.device
          );

        deviceStats.playTimeMs +=
          staleDelta;

        player.lastSeen =
          session.lastSeen;
      }

      session.playTimeMs +=
        Math.min(
          PLAYER_SESSION_TIMEOUT_MS,
          Math.max(
            0,
            timestamp -
              session.lastSeen
          )
        );

      session.endedAt =
        session.lastSeen;

      session.active =
        false;

      markDirty();
    }
  }
}

// ============================================================
// BRAIN OFFLINE
// ============================================================

function markOffline() {

  const threshold =
    now() -
    OFFLINE_MS;

  let changed =
    false;

  for (
    const id of Object.keys(
      db.brains
    )
  ) {

    const brain =
      db.brains[id];

    if (
      brain.status ===
        'online'
      &&
      brain.lastSeen <
        threshold
    ) {

      brain.status =
        'offline';

      changed =
        true;
    }
  }

  if (changed) {

    markDirty();
  }
}

    // ========================================================
    // SKILL REGISTRY
    // ========================================================

    if (
      pathname ===
        '/api/skills' &&
      method ===
        'GET'
    ) {
      if (!isAuth(req)) {
        return json(
          res,
          401,
          {
            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      const query =
        url.searchParams.get(
          'q'
        ) || '';

      const type =
        url.searchParams.get(
          'type'
        ) || '';

      const ownerId =
        url.searchParams.get(
          'ownerId'
        ) || '';

      const skills =
        skillRegistry.list({
          query,
          type,
          ownerId
        });

      return json(
        res,
        200,
        {
          success: true,
          total:
            skills.length,
          skills
        },
        corsHeaders
      );
    }

    if (
      pathname.startsWith(
        '/api/skills/'
      ) &&
      method ===
        'GET'
    ) {
      if (!isAuth(req)) {
        return json(
          res,
          401,
          {
            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      const id =
        decodeURIComponent(
          pathname.slice(
            '/api/skills/'.length
          )
        );

      const skill =
        skillRegistry.get(
          id
        );

      if (!skill) {
        return json(
          res,
          404,
          {
            error:
              'Skill not found'
          },
          corsHeaders
        );
      }

      return json(
        res,
        200,
        {
          success: true,
          skill
        },
        corsHeaders
      );
    }

    if (
      pathname ===
        '/api/skills' &&
      method ===
        'POST'
    ) {
      if (!verifyBrain(req)) {
        return json(
          res,
          401,
          {
            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(req);

      try {
        const skill =
          skillRegistry.create(
            body
          );

        return json(
          res,
          201,
          {
            success: true,
            skill
          },
          corsHeaders
        );

      } catch (error) {
        return json(
          res,
          400,
          {
            error:
              error.message
          },
          corsHeaders
        );
      }
    }

    if (
      pathname.startsWith(
        '/api/skills/'
      ) &&
      method ===
        'PATCH'
    ) {
      if (!verifyBrain(req)) {
        return json(
          res,
          401,
          {
            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const id =
        decodeURIComponent(
          pathname.slice(
            '/api/skills/'.length
          )
        );

      const body =
        await readBody(req);

      try {
        const skill =
          skillRegistry.update(
            id,
            body
          );

        return json(
          res,
          200,
          {
            success: true,
            skill
          },
          corsHeaders
        );

      } catch (error) {
        return json(
          res,
          400,
          {
            error:
              error.message
          },
          corsHeaders
        );
      }
    }

    if (
      pathname.startsWith(
        '/api/skills/'
      ) &&
      method ===
        'DELETE'
    ) {
      if (!verifyBrain(req)) {
        return json(
          res,
          401,
          {
            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const id =
        decodeURIComponent(
          pathname.slice(
            '/api/skills/'.length
          )
        );

      try {
        const skill =
          skillRegistry.remove(
            id
          );

        return json(
          res,
          200,
          {
            success: true,
            skill
          },
          corsHeaders
        );

      } catch (error) {
        return json(
          res,
          400,
          {
            error:
              error.message
          },
          corsHeaders
        );
      }
    }

// ============================================================
// BRAIN REGISTER
// ============================================================

function registerBrain(
  body,
  req
) {

  if (
    !body.brainId ||
    !body.userId
  ) {

    throw new Error(
      'brainId and userId are required'
    );
  }

  const timestamp =
    now();

  const id =
    safeString(
      body.brainId,
      64
    );

  const userId =
    safeUserId(
      body.userId
    );

  if (!userId) {

    throw new Error(
      'Invalid userId'
    );
  }

  const skills =
    parseSkills(
      body.skills
    );

  const ipHash =
    hashIp(
      getClientIp(
        req
      )
    );

  if (
    db.brains[id]
  ) {

    const brain =
      db.brains[id];

    brain.userId =
      userId;

    if (
      body.displayName
    ) {

      brain.displayName =
        safeString(
          body.displayName,
          100
        );
    }

    if (
      body.originalName
    ) {

      brain.originalName =
        safeString(
          body.originalName,
          100
        );
    }

    if (
      body.brainVersion
    ) {

      brain.brainVersion =
        safeString(
          body.brainVersion,
          50
        );
    }

    if (
      skills.length
    ) {

      brain.skills =
        skills;
    }

    brain.status =
      'online';

    brain.lastSeen =
      timestamp;

    brain.ipHash =
      ipHash;

  } else {

    db.brains[id] = {

      brainId:
        id,

      userId,

      displayName:
        body.displayName
          ? safeString(
              body.displayName,
              100
            )
          : null,

      originalName:
        body.originalName
          ? safeString(
              body.originalName,
              100
            )
          : null,

      brainVersion:
        body.brainVersion
          ? safeString(
              body.brainVersion,
              50
            )
          : null,

      skills,

      status:
        'online',

      createdAt:
        typeof body.createdAt ===
        'number'
          ? body.createdAt
          : timestamp,

      lastSeen:
        timestamp,

      ipHash:
        ipHash
    };
  }

  updatePlayerProfile(
    {
      ...body,
      userId
    },
    id
  );

  markDirty();

  return {

    success:
      true,

    brainId:
      id,

    userId
  };
}

// ============================================================
// BRAIN HEARTBEAT
// ============================================================

function heartbeatBrain(
  body
) {

  if (
    !body.brainId
  ) {

    throw new Error(
      'brainId is required'
    );
  }

  const id =
    safeString(
      body.brainId,
      64
    );

  const brain =
    db.brains[id];

  if (!brain) {

    return {
      found: false
    };
  }

  brain.lastSeen =
    typeof body.lastSeen ===
      'number'
      ? body.lastSeen
      : now();

  if (
    body.status
  ) {

    brain.status =
      safeString(
        body.status,
        20
      );
  }

  if (
    body.brainVersion
  ) {

    brain.brainVersion =
      safeString(
        body.brainVersion,
        50
      );
  }

  if (
    body.activeSkills !==
    undefined
  ) {

    brain.skills =
      parseSkills(
        body.activeSkills
      );
  }

  if (
    body.userId ||
    body.username ||
    body.displayName ||
    body.description !==
      undefined ||
    body.device ||
    body.avatar ||
    body.game
  ) {

    updatePlayerProfile(
      {
        ...body,

        userId:
          body.userId ||
          brain.userId
      },
      id
    );
  }

  markDirty();

  return {

    found:
      true
  };
}

// ============================================================
// PUBLIC PLAYER SUMMARY
// ============================================================

function buildPlayerSummary(
  player
) {

  if (!player) {

    return null;
  }

  const devices =
    {};

  for (
    const device of DEVICE_TYPES
  ) {

    const d =
      ensureDevice(
        player,
        device
      );

    devices[
      device
    ] = {

      sessions:
        d.sessions,

      playTimeMs:
        d.playTimeMs,

      firstSeen:
        d.firstSeen,

      lastSeen:
        d.lastSeen
    };
  }

  return {

    userId:
      player.userId,

    /*
     * PLAYER DESCRIPTION
     *
     * This is NOT the game description.
     */

    description:
      player.description ||
      null,

    current:
      player.current,

    usernameHistory:
      player.usernameHistory,

    displayNameHistory:
      player.displayNameHistory,

    avatarHistory:
      player.avatarHistory,

    devices,

    countryHistory:
      player.countryHistory,

    sessions:
      player.sessions,

    playTimeMs:
      player.playTimeMs,

    firstSeen:
      player.firstSeen,

    lastSeen:
      player.lastSeen,

    lastBrainId:
      player.lastBrainId,

    lastGame:
      player.lastGame,

    lastPlaceId:
      player.lastPlaceId,

    lastJobId:
      player.lastJobId
  };
}

// ============================================================
// ROUTER
// ============================================================

async function handler(
  req,
  res
) {

  const url =
    new URL(
      req.url,
      `http://${
        req.headers.host ||
        'localhost'
      }`
    );

  const pathname =
    url.pathname;

  const method =
    req.method;

  // ==========================================================
  // CORS
  // ==========================================================

  if (
    method ===
    'OPTIONS'
  ) {

    res.writeHead(
      204,
      {

        'Access-Control-Allow-Origin':
          req.headers.origin ||
          '*',

        'Access-Control-Allow-Methods':
  'GET,POST,PATCH,DELETE,OPTIONS',

        'Access-Control-Allow-Headers':
          'Content-Type, X-Brain-Secret, Authorization',

        'Access-Control-Allow-Credentials':
          'true'
      }
    );

    return res.end();
  }

  const corsHeaders = {

    'Access-Control-Allow-Origin':
      req.headers.origin ||
      '*',

    'Access-Control-Allow-Credentials':
      'true'
  };

  try {

    // ========================================================
    // HEALTH
    // ========================================================

    if (
      pathname ===
        '/health'
      &&
      method ===
        'GET'
    ) {

      cleanPlayerSessions();

      return json(
        res,
        200,
        {

          status:
            'ok',

          time:
            now(),

          brains:
            Object.keys(
              db.brains
            ).length,

          players:
            Object.keys(
              db.players
            ).length,

          activePlayerSessions:
            Object.values(
              db.playerSessions
            )
              .filter(
                s =>
                  s.active
              )
              .length
        },
        corsHeaders
      );
    }

    // ========================================================
    // LOGIN
    // ========================================================

    if (
      pathname ===
        '/api/auth/login'
      &&
      method ===
        'POST'
    ) {

      const ipHash =
        hashIp(
          getClientIp(
            req
          )
        );

      const rate =
        checkRate(
          ipHash
        );

      if (!rate.ok) {

        return json(
          res,
          429,
          {

            error:
              'Too many failed attempts. Try again later.',

            retryAfter:
              rate.retry
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      if (
        typeof body.password !==
          'string'
        ||
        body.password !==
          DASHBOARD_PASSWORD
      ) {

        failLogin(
          ipHash
        );

        return json(
          res,
          401,
          {

            error:
              'Incorrect password'
          },
          corsHeaders
        );
      }

      clearFail(
        ipHash
      );

      const sid =
        createSession();

      const cookie =
        `session=${sid}; HttpOnly; Path=/; Max-Age=${
          SESSION_MAX_AGE_MS / 1000
        }; SameSite=Lax` +
        (
          NODE_ENV ===
          'production'
            ? '; Secure'
            : ''
        );

      return json(
        res,
        200,
        {

          success:
            true
        },
        {

          ...corsHeaders,

          'Set-Cookie':
            cookie
        }
      );
    }

    // ========================================================
    // LOGOUT
    // ========================================================

    if (
      pathname ===
        '/api/auth/logout'
      &&
      method ===
        'POST'
    ) {

      const cookies =
        parseCookies(
          req.headers.cookie
        );

      destroySession(
        cookies.session
      );

      return json(
        res,
        200,
        {

          success:
            true
        },
        {

          ...corsHeaders,

          'Set-Cookie':
            'session=; HttpOnly; Path=/; Max-Age=0'
        }
      );
    }

    // ========================================================
    // AUTH CHECK
    // ========================================================

    if (
      pathname ===
        '/api/auth/check'
      &&
      method ===
        'GET'
    ) {

      return json(
        res,
        200,
        {

          authenticated:
            isAuth(req)
        },
        corsHeaders
      );
    }

    // ========================================================
    // BRAIN REGISTER
    // ========================================================

    if (
      pathname ===
        '/api/brains/register'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      try {

        const result =
          registerBrain(
            body,
            req
          );

        saveDB(
          true
        );

        return json(
          res,
          200,
          result,
          corsHeaders
        );

      } catch (e) {

        return json(
          res,
          400,
          {

            error:
              e.message
          },
          corsHeaders
        );
      }
    }

    // ========================================================
    // BRAIN HEARTBEAT
    // ========================================================

    if (
      pathname ===
        '/api/brains/heartbeat'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      try {

        const result =
          heartbeatBrain(
            body
          );

        if (
          !result.found
        ) {

          return json(
            res,
            404,
            {

              error:
                'Brain not found. Register first.'
            },
            corsHeaders
          );
        }

        saveDB(
          true
        );

        return json(
          res,
          200,
          {

            success:
              true
          },
          corsHeaders
        );

      } catch (e) {

        return json(
          res,
          400,
          {

            error:
              e.message
          },
          corsHeaders
        );
      }
    }

    // ========================================================
    // PLAYER PROFILE
    // ========================================================

    if (
      pathname ===
        '/api/player/profile'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      try {

        const player =
          updatePlayerProfile(
            body,
            body.brainId
          );

        saveDB(
          true
        );

        return json(
          res,
          200,
          {

            success:
              true,

            player:
              buildPlayerSummary(
                player
              )
          },
          corsHeaders
        );

      } catch (e) {

        return json(
          res,
          400,
          {

            error:
              e.message
          },
          corsHeaders
        );
      }
    }

    // ========================================================
    // PLAYER SESSION START
    // ========================================================

    if (
      pathname ===
        '/api/player/session/start'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      try {

        const result =
          startPlayerSession(
            body
          );

        saveDB(
          true
        );

        return json(
          res,
          200,
          {

            success:
              true,

            sessionId:
              result.session.sessionId,

            created:
              result.created,

            player:
              buildPlayerSummary(
                result.player
              )
          },
          corsHeaders
        );

      } catch (e) {

        return json(
          res,
          400,
          {

            error:
              e.message
          },
          corsHeaders
        );
      }
    }

    // ========================================================
    // PLAYER SESSION HEARTBEAT
    // ========================================================

    if (
      pathname ===
        '/api/player/session/heartbeat'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      try {

        const result =
          heartbeatPlayerSession(
            body
          );

        saveDB(
          true
        );

        return json(
          res,
          200,
          {

            success:
              true,

            found:
              result.found
          },
          corsHeaders
        );

      } catch (e) {

        return json(
          res,
          400,
          {

            error:
              e.message
          },
          corsHeaders
        );
      }
    }

    // ========================================================
    // PLAYER SESSION END
    // ========================================================

    if (
      pathname ===
        '/api/player/session/end'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      try {

        const result =
          endPlayerSession(
            body
          );

        saveDB(
          true
        );

        return json(
          res,
          200,
          {

            success:
              true,

            found:
              result.found,

            session:
              result.session ||
              null
          },
          corsHeaders
        );

      } catch (e) {

        return json(
          res,
          400,
          {

            error:
              e.message
          },
          corsHeaders
        );
      }
    }

// ========================================================
// ASTRA LANGUAGE LEARNING: OBSERVE
// ========================================================
if (
  pathname ===
    '/api/brain/language/observe'
  &&
  method ===
    'POST'
) {

  if (
    !verifyBrain(
      req
    )
  ) {

    return json(
      res,
      401,
      {
        error:
          'Invalid or missing Brain API secret'
      },
      corsHeaders
    );
  }

  const body =
    await readBody(
      req
    );

  try {

    const result =
      observeLanguage(
        body
      );

    saveDB(
      true
    );

    return json(
      res,
      200,
      result,
      corsHeaders
    );

  } catch (e) {

    return json(
      res,
      400,
      {
        error:
          e.message
      },
      corsHeaders
    );
  }
}

    // ========================================================
    // ASTRA BRAIN V6: LEARNING SUBMIT
    // ========================================================

    if (
      pathname ===
        '/api/brain/learning/submit'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      try {

        const result =
          submitLearningKnowledge(
            body
          );

        saveDB(
          true
        );

        return json(
          res,
          200,
          result,
          corsHeaders
        );

      } catch (e) {

        return json(
          res,
          400,
          {

            error:
              e.message
          },
          corsHeaders
        );
      }
    }

    // ========================================================
    // ASTRA BRAIN V6: LEARNING RECALL
    // ========================================================

    if (
      pathname ===
        '/api/brain/learning/recall'
      &&
      method ===
        'POST'
    ) {

      if (
        !verifyBrain(
          req
        )
      ) {

        return json(
          res,
          401,
          {

            error:
              'Invalid or missing Brain API secret'
          },
          corsHeaders
        );
      }

      const body =
        await readBody(
          req
        );

      const query =
        body.query ||
        body.topic ||
        body.game?.name ||
        '';

      const normalizedGame =
        body.game
          ? normalizeLearningGame(
              body.game
            )
          : null;

      const gameKey =
        normalizedGame
          ? getLearningGameKey(
              normalizedGame
            )
          : '';

      return json(
        res,
        200,
        {

          success:
            true,

          knowledge:
            getSharedLearningKnowledge(
              {

                q:
                  query,

                gameKey:
                  gameKey
              }
            )
        },
        corsHeaders
      );
    }

    // ========================================================
    // DASHBOARD: COLLECTIVE KNOWLEDGE
    // ========================================================

    if (
      pathname ===
        '/api/dashboard/knowledge'
      &&
      method ===
        'GET'
    ) {

      if (
        !isAuth(req)
      ) {

        return json(
          res,
          401,
          {

            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      const query =
        url.searchParams.get(
          'q'
        ) ||
        '';

      const gameKey =
        url.searchParams.get(
          'gameKey'
        ) ||
        '';

      return json(
        res,
        200,
        {

          success:
            true,

          knowledge:
            getSharedLearningKnowledge(
              {

                q:
                  query,

                gameKey:
                  gameKey
              }
            )
        },
        corsHeaders
      );
    }

    // ========================================================
    // DASHBOARD: DISCOVERED GAMES
    // ========================================================

    if (
      pathname ===
        '/api/dashboard/games'
      &&
      method ===
        'GET'
    ) {

      if (
        !isAuth(req)
      ) {

        return json(
          res,
          401,
          {

            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      return json(
        res,
        200,
        {

          success:
            true,

          games:
            getDashboardGames()
        },
        corsHeaders
      );
    }

    // ========================================================
    // DASHBOARD: COLLECTIVE LEARNING
    // ========================================================

    if (
      pathname ===
        '/api/dashboard/learning'
      &&
      method ===
        'GET'
    ) {

      if (
        !isAuth(req)
      ) {

        return json(
          res,
          401,
          {

            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      return json(
        res,
        200,
        {

          success:
            true,

          ...getDashboardLearningSummary()
        },
        corsHeaders
      );
    }

// ========================================================
// DASHBOARD: LANGUAGE LEARNING
// ========================================================
if (
  pathname ===
    '/api/dashboard/language'
  &&
  method ===
    'GET'
) {

  if (
    !isAuth(
      req
    )
  ) {

    return json(
      res,
      401,
      {
        error:
          'Unauthorized'
      },
      corsHeaders
    );
  }

  return json(
    res,
    200,
    getLanguageDashboard(),
    corsHeaders
  );
}

    // ========================================================
    // DASHBOARD: BRAIN LIST
    // ========================================================

    if (
      pathname ===
        '/api/brains'
      &&
      method ===
        'GET'
    ) {

      if (
        !isAuth(req)
      ) {

        return json(
          res,
          401,
          {

            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      markOffline();

      cleanPlayerSessions();

      const q =
        (
          url.searchParams.get(
            'q'
          ) ||
          ''
        )
          .toLowerCase()
          .trim();

      const statusFilter =
        (
          url.searchParams.get(
            'status'
          ) ||
          ''
        )
          .toLowerCase();

      let list =
        Object.values(
          db.brains
        );

      if (q) {

        list =
          list.filter(
            r =>
              (
                r.brainId ||
                ''
              )
                .toLowerCase()
                .includes(
                  q
                )

              ||

              (
                r.userId ||
                ''
              )
                .toLowerCase()
                .includes(
                  q
                )

              ||

              (
                r.displayName ||
                ''
              )
                .toLowerCase()
                .includes(
                  q
                )

              ||

              (
                r.originalName ||
                ''
              )
                .toLowerCase()
                .includes(
                  q
                )
          );
      }

      if (
        statusFilter ===
          'online'
        ||
        statusFilter ===
          'offline'
      ) {

        list =
          list.filter(
            r =>
              r.status ===
              statusFilter
          );
      }

      list.sort(
        (a, b) =>
          (
            b.lastSeen ||
            0
          ) -
          (
            a.lastSeen ||
            0
          )
      );

      const brains =
        list.map(
          r => {

            const player =
              db.players[
                r.userId
              ];

            return {

              brainId:
                r.brainId,

              userId:
                r.userId,

              displayName:
                r.displayName,

              originalName:
                r.originalName,

              brainVersion:
                r.brainVersion,

              skills:
                r.skills ||
                [],

              status:
                r.status,

              createdAt:
                r.createdAt,

              lastSeen:
                r.lastSeen,

              playerSummary:
                player
                  ? {

                      username:
                        player.current
                          ?.username ||
                        null,

                      displayName:
                        player.current
                          ?.displayName ||
                        null,

                      description:
                        player.description ||
                        null,

                      sessions:
                        player.sessions,

                      playTimeMs:
                        player.playTimeMs,

                      firstSeen:
                        player.firstSeen,

                      lastSeen:
                        player.lastSeen
                    }
                  : null
            };
          }
        );

      return json(
        res,
        200,
        {

          total:
            brains.length,

          online:
            brains.filter(
              b =>
                b.status ===
                'online'
            ).length,

          offline:
            brains.filter(
              b =>
                b.status !==
                'online'
            ).length,

          players:
            Object.keys(
              db.players
            ).length,

          brains
        },
        corsHeaders
      );
    }

    // ========================================================
    // DASHBOARD: PLAYER PROFILE
    // ========================================================

    if (
      pathname.startsWith(
        '/api/players/'
      )
      &&
      method ===
        'GET'
    ) {

      if (
        !isAuth(req)
      ) {

        return json(
          res,
          401,
          {

            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      cleanPlayerSessions();

      const userId =
        decodeURIComponent(
          pathname.slice(
            '/api/players/'.length
          )
        );

      const player =
        db.players[
          userId
        ];

      if (!player) {

        return json(
          res,
          404,
          {

            error:
              'Player not found'
          },
          corsHeaders
        );
      }

      return json(
        res,
        200,
        {

          success:
            true,

          player:
            buildPlayerSummary(
              player
            ),

          activeSessions:
            Object.values(
              db.playerSessions
            )
              .filter(
                session =>
                  session.userId ===
                    userId &&
                  session.active
              )
        },
        corsHeaders
      );
    }

    // ========================================================
    // DASHBOARD: BRAIN DETAIL
    // ========================================================

    if (
      pathname.startsWith(
        '/api/brains/'
      )
      &&
      method ===
        'GET'
    ) {

      if (
        !isAuth(req)
      ) {

        return json(
          res,
          401,
          {

            error:
              'Unauthorized'
          },
          corsHeaders
        );
      }

      markOffline();

      cleanPlayerSessions();

      const id =
        decodeURIComponent(
          pathname.slice(
            '/api/brains/'.length
          )
        );

      const brain =
        db.brains[
          id
        ];

      if (!brain) {

        return json(
          res,
          404,
          {

            error:
              'Brain not found'
          },
          corsHeaders
        );
      }

      const player =
        db.players[
          brain.userId
        ];

      return json(
        res,
        200,
        {

          brainId:
            brain.brainId,

          userId:
            brain.userId,

          displayName:
            brain.displayName,

          originalName:
            brain.originalName,

          brainVersion:
            brain.brainVersion,

          skills:
            brain.skills ||
            [],

          status:
            brain.status,

          createdAt:
            brain.createdAt,

          lastSeen:
            brain.lastSeen,

          player:
            player
              ? buildPlayerSummary(
                  player
                )
              : null
        },
        corsHeaders
      );
    }

    // ========================================================
    // STATIC FILE SECURITY
    // ========================================================

    const publicDir =
      path.resolve(
        __dirname,
        'public'
      );

    const requested =
      pathname ===
        '/'
        ? 'index.html'
        : pathname;

    const filePath =
      path.resolve(
        publicDir,
        '.' +
          requested
      );

    const relative =
      path.relative(
        publicDir,
        filePath
      );

    if (
      relative.startsWith(
        '..'
      ) ||
      path.isAbsolute(
        relative
      )
    ) {

      res.writeHead(
        403
      );

      return res.end(
        'Forbidden'
      );
    }

    if (
      fs.existsSync(
        filePath
      ) &&
      fs.statSync(
        filePath
      ).isFile()
    ) {

      return serveStatic(
        req,
        res,
        filePath
      );
    }

    // ========================================================
    // SPA FALLBACK
    // ========================================================

    const indexPath =
      path.join(
        publicDir,
        'index.html'
      );

    if (
      fs.existsSync(
        indexPath
      )
    ) {

      return serveStatic(
        req,
        res,
        indexPath
      );
    }

    res.writeHead(
      404
    );

    res.end(
      'Not found'
    );

  } catch (err) {

    console.error(
      err
    );

    return json(
      res,
      500,
      {

        error:
          'Internal server error'
      },
      corsHeaders
    );
  }
}

// ============================================================
// SERVER
// ============================================================

const server =
  http.createServer(
    handler
  );

server.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log(
      `Astra Brain Registry V2 running on port ${PORT}`
    );

    console.log(
      `Data: ${dbPath}`
    );

    console.log(
      `Players: ${
        Object.keys(
          db.players
        ).length
      }`
    );

    console.log(
      `Brains: ${
        Object.keys(
          db.brains
        ).length
      }`
    );
  }
);

// ============================================================
// PERIODIC CLEANUP
// ============================================================

setInterval(
  () => {

    markOffline();

    cleanPlayerSessions();

    saveDB(
      false
    );

  },
  30000
);

// ============================================================
// SHUTDOWN
// ============================================================

function shutdown() {

  try {

    saveDB(
      true
    );

  } finally {

    process.exit(
      0
    );
  }
}

process.on(
  'SIGTERM',
  shutdown
);

process.on(
  'SIGINT',
  shutdown
);
