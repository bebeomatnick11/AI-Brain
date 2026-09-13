/**
 * ============================================================
 * ASTRA BRAIN REGISTRY V2
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
 * Node 18+
 * Zero external runtime dependencies
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// ============================================================
// CONFIG
// ============================================================

const PORT = Number(process.env.PORT || 3000);

const DASHBOARD_PASSWORD =
  process.env.DASHBOARD_PASSWORD || 'ILove36';

const BRAIN_API_SECRET =
  process.env.BRAIN_API_SECRET ||
  'AstraBrainSecret_ChangeMe_InProduction_2026';

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
    loginAttempts: {}
  };
}

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      return createEmptyDB();
    }

    const data =
      JSON.parse(
        fs.readFileSync(dbPath, 'utf8')
      );

    return {
      brains: data.brains || {},
      players: data.players || {},
      playerSessions: data.playerSessions || {},
      sessions: data.sessions || {},
      loginAttempts: data.loginAttempts || {}
    };

  } catch (e) {

    console.error(
      'DB load error:',
      e.message
    );

    return createEmptyDB();
  }
}

let db = loadDB();

let dirty = false;

function markDirty() {
  dirty = true;
}

function saveDB(force = false) {

  if (!force && !dirty) {
    return;
  }

  try {

    const tmp =
      dbPath + '.tmp';

    fs.writeFileSync(
      tmp,
      JSON.stringify(db, null, 2),
      'utf8'
    );

    fs.renameSync(
      tmp,
      dbPath
    );

    dirty = false;

  } catch (e) {

    console.error(
      'DB save error:',
      e.message
    );
  }
}

setInterval(
  () => saveDB(false),
  SAVE_INTERVAL_MS
);

// ============================================================
// BASIC HELPERS
// ============================================================

function now() {
  return Date.now();
}

function safeString(value, max = 200) {

  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  return String(value)
    .slice(0, max);
}

function safeUserId(value) {

  const id =
    String(value || '')
      .trim();

  if (!/^\d+$/.test(id)) {
    return null;
  }

  return id.slice(0, 32);
}

function hashIp(ip) {

  if (!ip) {
    return 'unknown';
  }

  return crypto
    .createHash('sha256')
    .update(
      String(ip) +
      SESSION_SECRET
    )
    .digest('hex')
    .slice(0, 16);
}

function genId() {

  return crypto
    .randomBytes(24)
    .toString('hex');
}

function genSessionId() {

  return (
    'ps_' +
    crypto
      .randomBytes(18)
      .toString('hex')
  );
}

// ============================================================
// COOKIES / AUTH
// ============================================================

function parseCookies(header) {

  const out = {};

  if (!header) {
    return out;
  }

  header
    .split(';')
    .forEach(part => {

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
    });

  return out;
}

function getClientIp(req) {

  return (
    (req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()
    ||
    req.headers['x-real-ip']
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
    const id of Object.keys(db.sessions)
  ) {

    if (
      db.sessions[id].expiresAt <
      timestamp
    ) {

      delete db.sessions[id];
      markDirty();
    }
  }
}

function isAuth(req) {

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
    session.expiresAt > now()
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

function destroySession(sid) {

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

function getBrainSecret(req) {

  return (
    req.headers['x-brain-secret']
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

function verifyBrain(req) {

  return (
    getBrainSecret(req) ===
    BRAIN_API_SECRET
  );
}

// ============================================================
// RATE LIMIT
// ============================================================

function checkRate(ipHash) {

  const timestamp =
    now();

  const row =
    db.loginAttempts[ipHash];

  if (!row) {
    return { ok: true };
  }

  if (
    timestamp - row.last >
    15 * 60 * 1000
  ) {

    delete db.loginAttempts[ipHash];

    markDirty();

    return { ok: true };
  }

  if (row.count >= 5) {

    return {
      ok: false,
      retry: Math.ceil(
        (
          15 * 60 * 1000 -
          (
            timestamp -
            row.last
          )
        ) / 1000
      )
    };
  }

  return { ok: true };
}

function failLogin(ipHash) {

  const timestamp =
    now();

  if (
    db.loginAttempts[ipHash]
  ) {

    db.loginAttempts[ipHash].count++;

    db.loginAttempts[ipHash].last =
      timestamp;

  } else {

    db.loginAttempts[ipHash] = {
      count: 1,
      last: timestamp
    };
  }

  markDirty();
  saveDB(true);
}

function clearFail(ipHash) {

  if (
    db.loginAttempts[ipHash]
  ) {

    delete db.loginAttempts[ipHash];

    markDirty();
    saveDB(true);
  }
}

// ============================================================
// SKILLS
// ============================================================

function parseSkills(value) {

  if (Array.isArray(value)) {

    return value
      .map(
        x => String(x).slice(0, 80)
      )
      .slice(0, 50);
  }

  if (
    typeof value === 'string'
  ) {

    try {

      const parsed =
        JSON.parse(value);

      if (
        Array.isArray(parsed)
      ) {

        return parsed
          .map(
            x => String(x).slice(0, 80)
          )
          .slice(0, 50);
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
    JSON.stringify(data);

  res.writeHead(
    status,
    {
      'Content-Type':
        'application/json; charset=utf-8',

      'Content-Length':
        Buffer.byteLength(body),

      ...extraHeaders
    }
  );

  res.end(body);
}

// ============================================================
// REQUEST BODY
// ============================================================

function readBody(req) {

  return new Promise(
    (resolve, reject) => {

      let data = '';

      req.on(
        'data',
        chunk => {

          data += chunk;

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
              JSON.parse(data)
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
// STATIC FILES
// ============================================================

function serveStatic(
  req,
  res,
  filePath
) {

  const ext =
    path
      .extname(filePath)
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
    (err, content) => {

      if (err) {

        res.writeHead(404);
        res.end('Not found');

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

      res.end(content);
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
      item.value === value
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
      fingerprint || null,

    imageUrl:
      imageUrl || null,

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

function normalizeDevice(value) {

  const device =
    String(
      value || ''
    )
      .toLowerCase()
      .trim();

  if (
    DEVICE_TYPES.includes(device)
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
    normalizeDevice(device);

  if (
    !player.devices[device]
  ) {

    player.devices[device] = {

      sessions: 0,

      playTimeMs: 0,

      firstSeen: null,

      lastSeen: null
    };
  }

  return player.devices[device];
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

      username: null,

      displayName: null,

      avatar: null
    },

    usernameHistory: [],

    displayNameHistory: [],

    avatarHistory: [],

    devices: {

      mobile: {
        sessions: 0,
        playTimeMs: 0,
        firstSeen: null,
        lastSeen: null
      },

      tablet: {
        sessions: 0,
        playTimeMs: 0,
        firstSeen: null,
        lastSeen: null
      },

      computer: {
        sessions: 0,
        playTimeMs: 0,
        firstSeen: null,
        lastSeen: null
      },

      console: {
        sessions: 0,
        playTimeMs: 0,
        firstSeen: null,
        lastSeen: null
      },

      unknown: {
        sessions: 0,
        playTimeMs: 0,
        firstSeen: null,
        lastSeen: null
      }
    },

    countryHistory: [],

    sessions: 0,

    playTimeMs: 0,

    firstSeen:
      timestamp,

    lastSeen:
      timestamp,

    lastBrainId: null,

    lastGame: null,

    lastPlaceId: null,

    lastJobId: null
  };
}

function getPlayer(
  userId,
  timestamp
) {

  let player =
    db.players[userId];

  if (!player) {

    player =
      createPlayer(
        userId,
        timestamp
      );

    db.players[userId] =
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
    player.current = {};
  }

  if (!Array.isArray(
    player.usernameHistory
  )) {
    player.usernameHistory = [];
  }

  if (!Array.isArray(
    player.displayNameHistory
  )) {
    player.displayNameHistory = [];
  }

  if (!Array.isArray(
    player.avatarHistory
  )) {
    player.avatarHistory = [];
  }

  if (!Array.isArray(
    player.countryHistory
  )) {
    player.countryHistory = [];
  }

  if (!player.devices) {
    player.devices = {};
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
    player.sessions = 0;
  }

  if (
    typeof player.playTimeMs !==
    'number'
  ) {
    player.playTimeMs = 0;
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
        item.code === code
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
    brainId || player.lastBrainId;

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

  const deviceStats =
    ensureDevice(
      player,
      device
    );

  if (!deviceStats.firstSeen) {
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
      created: false
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
  ] = session;

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
    created: true
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

    delta = 0;
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
    found: true,
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
      found: true,
      alreadyEnded: true,
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

    delta = 0;
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
    found: true,
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

      let delta =
        session.lastSeen -
        session.startedAt;

      if (delta < 0) {
        delta = 0;
      }

      const player =
        db.players[
          session.userId
        ];

      if (player) {

        /*
         * Do not double count.
         * Heartbeats already accounted
         * for previous intervals.
         *
         * The final stale interval is
         * intentionally limited.
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
      getClientIp(req)
    );

  if (db.brains[id]) {

    const brain =
      db.brains[id];

    brain.userId =
      userId;

    if (body.displayName) {

      brain.displayName =
        safeString(
          body.displayName,
          100
        );
    }

    if (body.originalName) {

      brain.originalName =
        safeString(
          body.originalName,
          100
        );
    }

    if (body.brainVersion) {

      brain.brainVersion =
        safeString(
          body.brainVersion,
          50
        );
    }

    if (skills.length) {
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
    success: true,
    brainId: id,
    userId
  };
}

// ============================================================
// BRAIN HEARTBEAT
// ============================================================

function heartbeatBrain(
  body
) {

  if (!body.brainId) {

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

  if (body.status) {

    brain.status =
      safeString(
        body.status,
        20
      );
  }

  if (body.brainVersion) {

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
    body.device ||
    body.avatar
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
    found: true
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

  const devices = {};

  for (
    const device of DEVICE_TYPES
  ) {

    const d =
      ensureDevice(
        player,
        device
      );

    devices[device] = {

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
      `http://${req.headers.host || 'localhost'}`
    );

  const pathname =
    url.pathname;

  const method =
    req.method;

  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  if (
    method ===
    'OPTIONS'
  ) {

    res.writeHead(
      204,
      {
        'Access-Control-Allow-Origin':
          req.headers.origin || '*',

        'Access-Control-Allow-Methods':
          'GET,POST,OPTIONS',

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
      req.headers.origin || '*',

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
                s => s.active
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
          getClientIp(req)
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
        await readBody(req);

      if (
        typeof body.password !==
        'string'
        ||
        body.password !==
        DASHBOARD_PASSWORD
      ) {

        failLogin(ipHash);

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

      clearFail(ipHash);

      const sid =
        createSession();

      const cookie =
        `session=${sid}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_MS / 1000}; SameSite=Lax` +
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

        const result =
          registerBrain(
            body,
            req
          );

        saveDB(true);

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

        const result =
          heartbeatBrain(
            body
          );

        if (!result.found) {

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

        saveDB(true);

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

        const player =
          updatePlayerProfile(
            body,
            body.brainId
          );

        saveDB(true);

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

        const result =
          startPlayerSession(
            body
          );

        saveDB(true);

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

        const result =
          heartbeatPlayerSession(
            body
          );

        saveDB(true);

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

        const result =
          endPlayerSession(
            body
          );

        saveDB(true);

        return json(
          res,
          200,
          {
            success:
              true,

            found:
              result.found,

            session:
              result.session || null
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
    // DASHBOARD: BRAIN LIST
    // ========================================================

    if (
      pathname ===
      '/api/brains'
      &&
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

      markOffline();

      cleanPlayerSessions();

      const q =
        (
          url.searchParams.get(
            'q'
          ) || ''
        )
          .toLowerCase()
          .trim();

      const statusFilter =
        (
          url.searchParams.get(
            'status'
          ) || ''
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
                .includes(q)

              ||

              (
                r.userId ||
                ''
              )
                .toLowerCase()
                .includes(q)

              ||

              (
                r.displayName ||
                ''
              )
                .toLowerCase()
                .includes(q)

              ||

              (
                r.originalName ||
                ''
              )
                .toLowerCase()
                .includes(q)
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
            b.lastSeen || 0
          ) -
          (
            a.lastSeen || 0
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
                r.skills || [],

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
                        player.current?.username ||
                        null,

                      displayName:
                        player.current?.displayName ||
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

      markOffline();

      cleanPlayerSessions();

      const id =
        decodeURIComponent(
          pathname.slice(
            '/api/brains/'.length
          )
        );

      const brain =
        db.brains[id];

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
            brain.skills || [],

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
      pathname === '/'
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
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {

      res.writeHead(403);
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

    res.writeHead(404);
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
      `Players: ${Object.keys(db.players).length}`
    );

    console.log(
      `Brains: ${Object.keys(db.brains).length}`
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

    saveDB(false);

  },
  30000
);

// ============================================================
// SHUTDOWN
// ============================================================

function shutdown() {

  try {
    saveDB(true);
  } finally {
    process.exit(0);
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
