const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split(/\r?\n/).forEach((line) => {
    const i = line.indexOf('=');
    if (i > -1) {
      const key = line.slice(0, i).trim();
      const val = line.slice(i + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  });
} catch (e) { /* no .env file */ }

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@elure.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_HOURS = 24;
const SESSION_COOKIE = 'elure_session';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');
const isProd = process.env.NODE_ENV === 'production';

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}
ensureDataFile();

function readBookings() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const sessions = new Map();

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function isAuthed(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return false;
  const rec = sessions.get(token);
  if (!rec) return false;
  if (rec.expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

const loginAttempts = new Map();
function loginLocked(ip) {
  const rec = loginAttempts.get(ip);
  if (!rec) return false;
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) return true;
  loginAttempts.delete(ip);
  return false;
}
function recordFailedAttempt(ip) {
  const rec = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= 5) rec.lockedUntil = Date.now() + 15 * 60 * 1000;
  loginAttempts.set(ip, rec);
}

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (loginLocked(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !ADMIN_PASSWORD || !safeEqual(email, ADMIN_EMAIL) || !safeEqual(password, ADMIN_PASSWORD)) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  loginAttempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expires: Date.now() + SESSION_HOURS * 60 * 60 * 1000 });
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 60 * 60}${isProd ? '; Secure' : ''}`
  );
  res.json({ success: true });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  sessions.delete(cookies[SESSION_COOKIE]);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.json({ success: true });
});

app.post('/api/bookings', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120);
  const email = String(req.body.email || '').trim().slice(0, 120);
  const phone = String(req.body.phone || '').trim().slice(0, 40);
  const service = String(req.body.service || '').trim().slice(0, 120);
  const message = String(req.body.message || '').trim().slice(0, 2000);
  const method = String(req.body.method || '').trim().slice(0, 40);

  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!phone) return res.status(400).json({ error: 'Phone is required.' });

  const bookings = readBookings();
  const booking = {
    id: Date.now(),
    name,
    email,
    phone,
    service,
    message,
    method,
    status: 'new',
    created_at: new Date().toISOString(),
  };
  bookings.push(booking);
  writeBookings(bookings);
  res.status(201).json({ success: true, id: booking.id });
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const { status } = req.query;
  let bookings = readBookings();
  if (status && status !== 'all') bookings = bookings.filter((b) => b.status === status);
  bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(bookings);
});

app.get('/api/stats', requireAuth, (req, res) => {
  const bookings = readBookings();
  const now = new Date();
  const today = now.toDateString();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const newCount = bookings.filter((b) => b.status === 'new').length;
  const todayCount = bookings.filter((b) => new Date(b.created_at).toDateString() === today).length;
  const monthCount = bookings.filter((b) => {
    const d = new Date(b.created_at);
    return `${d.getFullYear()}-${d.getMonth()}` === monthKey;
  }).length;
  const serviceCounts = {};
  bookings.forEach((b) => {
    if (b.service) serviceCounts[b.service] = (serviceCounts[b.service] || 0) + 1;
  });
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([service, count]) => ({ service, count }));
  res.json({ total: bookings.length, today: todayCount, thisMonth: monthCount, new: newCount, topServices });
});

app.patch('/api/bookings/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['new', 'contacted', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  const bookings = readBookings();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  booking.status = status;
  writeBookings(bookings);
  res.json({ success: true });
});

app.delete('/api/bookings/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  let bookings = readBookings();
  const filtered = bookings.filter((b) => b.id !== id);
  if (filtered.length === bookings.length) return res.status(404).json({ error: 'Booking not found.' });
  writeBookings(filtered);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`ELURE server running on port ${PORT}`);
});
