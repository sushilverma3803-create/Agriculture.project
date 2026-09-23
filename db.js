/**
 * EcoHarvest Database Layer
 * Uses Node.js 24's native node:sqlite for persistent SQLite storage.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'ecoharvest.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for performance
try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch (e) {
  // Ignore if WAL fails
}

// 1. Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    farm TEXT NOT NULL,
    acres TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_email TEXT,
    type TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 2. Cryptographic Password Hashing Functions
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// 3. User Repository Methods
function findUserByEmail(email) {
  if (!email) return null;
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
  return stmt.get(email.trim());
}

function findUserById(id) {
  const stmt = db.prepare('SELECT id, name, email, farm, acres, created_at FROM users WHERE id = ?');
  return stmt.get(id);
}

function createUser({ name, email, password, farm, acres }) {
  const salt = crypto.randomBytes(16).toString('hex');
  const password_hash = hashPassword(password, salt);
  const cleanEmail = email.trim().toLowerCase();

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, salt, farm, acres)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(name.trim(), cleanEmail, password_hash, salt, farm.trim(), acres.toString());
  return {
    id: result.lastInsertRowid,
    name: name.trim(),
    email: cleanEmail,
    farm: farm.trim(),
    acres: acres.toString()
  };
}

// 4. Query & Activity History Methods
function addHistory({ user_id = null, user_email = 'guest@ecoharvest.io', type, details }) {
  const stmt = db.prepare(`
    INSERT INTO query_history (user_id, user_email, type, details)
    VALUES (?, ?, ?, ?)
  `);
  const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
  const result = stmt.run(user_id, user_email, type, detailsStr);
  return {
    id: result.lastInsertRowid,
    user_id,
    user_email,
    type,
    details: detailsStr,
    timestamp: new Date().toISOString()
  };
}

function getHistory(user_email = null, limit = 50) {
  if (user_email) {
    const stmt = db.prepare(`
      SELECT * FROM query_history
      WHERE LOWER(user_email) = LOWER(?)
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(user_email.trim(), limit);
  } else {
    const stmt = db.prepare(`
      SELECT * FROM query_history
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }
}

function getUserSolutionsHistory({ user_id = null, user_email = null, limit = 50 }) {
  let query = `
    SELECT * FROM query_history
    WHERE type IN ('AGRICULTURAL_SOLUTION', 'AGRONOMIC_DIAGNOSIS')
  `;
  const params = [];

  if (user_id && user_email) {
    query += ` AND (user_id = ? OR LOWER(user_email) = LOWER(?))`;
    params.push(user_id, user_email.trim());
  } else if (user_id) {
    query += ` AND user_id = ?`;
    params.push(user_id);
  } else if (user_email) {
    query += ` AND LOWER(user_email) = LOWER(?)`;
    params.push(user_email.trim());
  }

  query += ` ORDER BY id DESC LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);

  return rows.map(row => {
    let parsedDetails = {};
    try {
      parsedDetails = JSON.parse(row.details);
    } catch (e) {
      parsedDetails = { raw: row.details };
    }
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      type: row.type,
      timestamp: row.timestamp,
      problem: parsedDetails.problem || parsedDetails.symptoms || '',
      category: parsedDetails.category || '',
      crop: parsedDetails.crop || '',
      urgency: parsedDetails.urgency || '',
      solution: parsedDetails.solution || {
        diagnosis: {
          title: parsedDetails.title,
          scientificName: parsedDetails.scientificName,
          confidence: parsedDetails.confidence,
          severity: parsedDetails.urgency,
          pathogenOrCause: parsedDetails.pathogenOrCause,
          riskAssessment: parsedDetails.riskAssessment
        },
        treatments: parsedDetails.treatments,
        preventionTips: parsedDetails.preventionTips,
        telemetryAdvice: parsedDetails.telemetryAdvice
      }
    };
  });
}

function getUserCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  return stmt.get().count;
}

// 5. Seed Default Demo User
function seedDemoUser() {
  const demoEmail = 'demo@ecoharvest.io';
  const existing = findUserByEmail(demoEmail);
  if (!existing) {
    createUser({
      name: 'Dr. Sarah Jenkins',
      email: demoEmail,
      password: 'EcoFarmer2026!',
      farm: 'GreenMeadow Biofarms',
      acres: '1,250'
    });
    // Add initial history entry
    addHistory({
      user_email: demoEmail,
      type: 'SYSTEM_INITIALIZATION',
      details: { note: 'EcoHarvest IoT Gateway connected. 64 nodes synced.' }
    });
    console.log('🌱 Seeded default demo grower: demo@ecoharvest.io');
  }
}

seedDemoUser();

module.exports = {
  db,
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  addHistory,
  getHistory,
  getUserSolutionsHistory,
  getUserCount
};
