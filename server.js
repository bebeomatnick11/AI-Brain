/**
 * Roblox AI Brain Registry - Zero dependency version
 * Pure Node.js (no npm packages required)
 * Deploy anywhere that runs Node 18+
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// ==================== CONFIG ====================
const PORT = process.env.PORT || 3000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
const BRAIN_API_SECRET = process.env.BRAIN_API_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h
const OFFLINE_MS = 2 * 60 * 1000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Bắt buộc phải set 2 biến môi trường này khi deploy
if (!DASHBOARD_PASSWORD || !BRAIN_API_SECRET) {
  console.error('FATAL: Missing required environment variables.');
  console.error('Please set:');
  console.error('  DASHBOARD_PASSWORD=your_password');
  console.error('  BRAIN_API_SECRET=your_strong_secret');
  process.exit(1);
}

// ==================== STORAGE ====================
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'brains.json');

function loadDB() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      return {
        brains: data.brains || {},
        sessions: data.sessions || {},
        loginAttempts: data.loginAttempts || {},
      };
    }
  } catch (e) {
    console.error('DB load error:', e.message);
  }
  return { brains: {}, sessions: {}, loginAttempts: {} };
}

function saveDB() {
  try {
    const tmp = dbPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, dbPath);
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

let db = loadDB();
setInterval(saveDB, 8000);

// ==================== HELPERS ====================
function hashIp(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(String(ip) + SESSION_SECRET).digest('hex').slice(0, 16);
}

function genId() {
  return crypto.randomBytes(24).toString('hex');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach(p => {
    const [k, ...v] = p.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress || '';
}

function cleanSessions() {
  const now = Date.now();
  for (const id of Object.keys(db.sessions)) {
    if (db.sessions[id].expiresAt < now) delete db.sessions[id];
  }
}

function isAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies.session;
  if (!sid) return false;
  cleanSessions();
  const s = db.sessions[sid];
  return !!(s && s.expiresAt > Date.now());
}

function createSession() {
  const sid = genId();
  const now = Date.now();
  db.sessions[sid] = { createdAt: now, expiresAt: now + SESSION_MAX_AGE_MS };
  saveDB();
  return sid;
}

function destroySession(sid) {
  if (sid && db.sessions[sid]) {
    delete db.sessions[sid];
    saveDB();
  }
}

function checkRate(ipHash) {
  const now = Date.now();
  const row = db.loginAttempts[ipHash];
  if (!row) return { ok: true };
  if (now - row.last > 15 * 60 * 1000) {
    delete db.loginAttempts[ipHash];
    return { ok: true };
  }
  if (row.count >= 5) {
    return { ok: false, retry: Math.ceil((15 * 60 * 1000 - (now - row.last)) / 1000) };
  }
  return { ok: true };
}

function failLogin(ipHash) {
  const now = Date.now();
  if (db.loginAttempts[ipHash]) {
    db.loginAttempts[ipHash].count++;
    db.loginAttempts[ipHash].last = now;
  } else {
    db.loginAttempts[ipHash] = { count: 1, last: now };
  }
  saveDB();
}

function clearFail(ipHash) {
  if (db.loginAttempts[ipHash]) {
    delete db.loginAttempts[ipHash];
    saveDB();
  }
}

function parseSkills(s) {
  if (Array.isArray(s)) return s.map(x => String(x).slice(0, 50)).slice(0, 30);
  if (typeof s === 'string') {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p.map(x => String(x).slice(0, 50)).slice(0, 30);
    } catch {}
  }
  return [];
}

function markOffline() {
  const th = Date.now() - OFFLINE_MS;
  let ch = false;
  for (const id of Object.keys(db.brains)) {
    if (db.brains[id].status === 'online' && db.brains[id].lastSeen < th) {
      db.brains[id].status = 'offline';
      ch = true;
    }
  }
  if (ch) saveDB();
}

function json(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 65536) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ==================== ROUTER ====================
async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Brain-Secret, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
    return res.end();
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  };

  try {
    // Health
    if (pathname === '/health' && method === 'GET') {
      return json(res, 200, { status: 'ok', time: Date.now(), brains: Object.keys(db.brains).length }, corsHeaders);
    }

    // Auth login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const ipHash = hashIp(getClientIp(req));
      const rate = checkRate(ipHash);
      if (!rate.ok) {
        return json(res, 429, { error: 'Too many failed attempts. Try again later.', retryAfter: rate.retry }, corsHeaders);
      }
      const body = await readBody(req);
      if (typeof body.password !== 'string' || body.password !== DASHBOARD_PASSWORD) {
        failLogin(ipHash);
        return json(res, 401, { error: 'Incorrect password' }, corsHeaders);
      }
      clearFail(ipHash);
      const sid = createSession();
      const cookie = `session=${sid}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_MS / 1000}; SameSite=Lax${NODE_ENV === 'production' ? '; Secure' : ''}`;
      return json(res, 200, { success: true }, { ...corsHeaders, 'Set-Cookie': cookie });
    }

    // Auth logout
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const cookies = parseCookies(req.headers.cookie);
      destroySession(cookies.session);
      return json(res, 200, { success: true }, {
        ...corsHeaders,
        'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0',
      });
    }

    // Auth check
    if (pathname === '/api/auth/check' && method === 'GET') {
      return json(res, 200, { authenticated: isAuth(req) }, corsHeaders);
    }

    // Brain register
    if (pathname === '/api/brains/register' && method === 'POST') {
      const secret = req.headers['x-brain-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (secret !== BRAIN_API_SECRET) {
        return json(res, 401, { error: 'Invalid or missing Brain API secret' }, corsHeaders);
      }
      const body = await readBody(req);
      if (!body.brainId || !body.userId) {
        return json(res, 400, { error: 'brainId and userId are required' }, corsHeaders);
      }
      const now = Date.now();
      const id = String(body.brainId).slice(0, 64);
      const skills = parseSkills(body.skills);
      const ipHash = hashIp(getClientIp(req));

      if (db.brains[id]) {
        const b = db.brains[id];
        b.userId = String(body.userId).slice(0, 32);
        if (body.displayName) b.displayName = String(body.displayName).slice(0, 100);
        if (body.originalName) b.originalName = String(body.originalName).slice(0, 100);
        if (body.brainVersion) b.brainVersion = String(body.brainVersion).slice(0, 50);
        if (skills.length) b.skills = skills;
        b.status = 'online';
        b.lastSeen = now;
        b.ipHash = ipHash;
      } else {
        db.brains[id] = {
          brainId: id,
          userId: String(body.userId).slice(0, 32),
          displayName: body.displayName ? String(body.displayName).slice(0, 100) : null,
          originalName: body.originalName ? String(body.originalName).slice(0, 100) : null,
          brainVersion: body.brainVersion ? String(body.brainVersion).slice(0, 50) : null,
          skills,
          status: 'online',
          createdAt: typeof body.createdAt === 'number' ? body.createdAt : now,
          lastSeen: now,
          ipHash,
        };
      }
      saveDB();
      return json(res, 200, { success: true, brainId: id }, corsHeaders);
    }

    // Brain heartbeat
    if (pathname === '/api/brains/heartbeat' && method === 'POST') {
      const secret = req.headers['x-brain-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (secret !== BRAIN_API_SECRET) {
        return json(res, 401, { error: 'Invalid or missing Brain API secret' }, corsHeaders);
      }
      const body = await readBody(req);
      if (!body.brainId) {
        return json(res, 400, { error: 'brainId is required' }, corsHeaders);
      }
      const id = String(body.brainId);
      const brain = db.brains[id];
      if (!brain) {
        return json(res, 404, { error: 'Brain not found. Register first.' }, corsHeaders);
      }
      brain.lastSeen = typeof body.lastSeen === 'number' ? body.lastSeen : Date.now();
      if (body.status) brain.status = String(body.status).slice(0, 20);
      if (body.brainVersion) brain.brainVersion = String(body.brainVersion).slice(0, 50);
      if (body.activeSkills !== undefined) brain.skills = parseSkills(body.activeSkills);
      saveDB();
      return json(res, 200, { success: true }, corsHeaders);
    }

    // Dashboard list (protected)
    if (pathname === '/api/brains' && method === 'GET') {
      if (!isAuth(req)) return json(res, 401, { error: 'Unauthorized' }, corsHeaders);
      markOffline();
      const q = (url.searchParams.get('q') || '').toLowerCase().trim();
      const statusFilter = (url.searchParams.get('status') || '').toLowerCase();

      let list = Object.values(db.brains);
      if (q) {
        list = list.filter(r =>
          (r.brainId || '').toLowerCase().includes(q) ||
          (r.userId || '').toLowerCase().includes(q) ||
          (r.displayName || '').toLowerCase().includes(q) ||
          (r.originalName || '').toLowerCase().includes(q)
        );
      }
      if (statusFilter === 'online' || statusFilter === 'offline') {
        list = list.filter(r => r.status === statusFilter);
      }
      list.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

      const brains = list.map(r => ({
        brainId: r.brainId,
        userId: r.userId,
        displayName: r.displayName,
        originalName: r.originalName,
        brainVersion: r.brainVersion,
        skills: r.skills || [],
        status: r.status,
        createdAt: r.createdAt,
        lastSeen: r.lastSeen,
      }));

      return json(res, 200, {
        total: brains.length,
        online: brains.filter(b => b.status === 'online').length,
        offline: brains.filter(b => b.status !== 'online').length,
        brains,
      }, corsHeaders);
    }

    // Dashboard detail (protected)
    if (pathname.startsWith('/api/brains/') && method === 'GET') {
      if (!isAuth(req)) return json(res, 401, { error: 'Unauthorized' }, corsHeaders);
      markOffline();
      const id = decodeURIComponent(pathname.slice('/api/brains/'.length));
      const r = db.brains[id];
      if (!r) return json(res, 404, { error: 'Brain not found' }, corsHeaders);
      return json(res, 200, {
        brainId: r.brainId,
        userId: r.userId,
        displayName: r.displayName,
        originalName: r.originalName,
        brainVersion: r.brainVersion,
        skills: r.skills || [],
        status: r.status,
        createdAt: r.createdAt,
        lastSeen: r.lastSeen,
      }, corsHeaders);
    }

    // Static files
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(path.join(__dirname, 'public'))) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStatic(req, res, filePath);
    }

    // SPA fallback
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveStatic(req, res, indexPath);
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'Internal server error' }, corsHeaders);
  }
}

const server = http.createServer(handler);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Roblox Brain Registry running on http://0.0.0.0:${PORT}`);
  console.log(`Password: set via DASHBOARD_PASSWORD env`);
  console.log(`Brain secret: set via BRAIN_API_SECRET`);
  console.log(`Data: ${dbPath}`);
});

process.on('SIGTERM', () => { saveDB(); process.exit(0); });
process.on('SIGINT', () => { saveDB(); process.exit(0); });
