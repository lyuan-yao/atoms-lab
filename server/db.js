import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "atoms.sqlite"));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    credits INTEGER NOT NULL DEFAULT 120,
    grants TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    spec_json TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    current_version_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    html TEXT NOT NULL,
    spec_json TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL,
    agent TEXT,
    title TEXT,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS publications (
    slug TEXT PRIMARY KEY,
    project_id TEXT UNIQUE NOT NULL,
    version_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS example_cache (
    key TEXT PRIMARY KEY,
    html TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pub_views (
    slug TEXT NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (slug, day)
  );
  CREATE TABLE IF NOT EXISTS pub_feedback (
    slug TEXT PRIMARY KEY,
    likes INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS email_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pub_comments (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

for (const [column, ddl] of [
  ["views", "ALTER TABLE publications ADD COLUMN views INTEGER NOT NULL DEFAULT 0"],
  ["last_viewed_at", "ALTER TABLE publications ADD COLUMN last_viewed_at INTEGER"],
]) {
  const columns = db.prepare("PRAGMA table_info(publications)").all().map((item) => item.name);
  if (!columns.includes(column)) db.exec(ddl);
}

export function withTx(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already closed */
    }
    throw error;
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, encoded) {
  const [salt, hash] = String(encoded || "").split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    credits: row.credits,
    createdAt: row.created_at,
  };
}

export function spendCredits(userId, cost, reason) {
  const user = db.prepare("SELECT credits FROM users WHERE id = ?").get(userId);
  if (!user || user.credits < cost) {
    const error = new Error("积分不够了。可以在定价页领取演示套餐，不会产生真实扣款。");
    error.status = 402;
    throw error;
  }
  db.prepare("UPDATE users SET credits = credits - ? WHERE id = ?").run(cost, userId);
  db.prepare("INSERT INTO ledger (id, user_id, delta, reason, created_at) VALUES (?, ?, ?, ?, ?)").run(
    cryptoRandom(),
    userId,
    -cost,
    reason,
    Date.now(),
  );
}

export function grantPlan(userId, plan, amount) {
  const user = db.prepare("SELECT grants, plan FROM users WHERE id = ?").get(userId);
  const grants = new Set(String(user?.grants || "").split(",").filter(Boolean));
  if (grants.has(plan)) {
    const error = new Error("这个演示套餐已经领取过了。");
    error.status = 400;
    throw error;
  }
  grants.add(plan);
  db.prepare("UPDATE users SET plan = ?, credits = credits + ?, grants = ? WHERE id = ?").run(
    plan,
    amount,
    [...grants].join(","),
    userId,
  );
  db.prepare("INSERT INTO ledger (id, user_id, delta, reason, created_at) VALUES (?, ?, ?, ?, ?)").run(
    cryptoRandom(),
    userId,
    amount,
    plan === "pro" ? "领取演示套餐 Pro" : "领取演示套餐 Max",
    Date.now(),
  );
}

export function cryptoRandom() {
  return randomBytes(16).toString("hex");
}

export function createSession(userId) {
  const token = randomBytes(24).toString("hex");
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 30;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return token;
}

export function userFromToken(token) {
  if (!token) return null;
  return db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now());
}

export function mePayload(userId) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const ledger = db
    .prepare("SELECT delta, reason, created_at AS createdAt FROM ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 12")
    .all(userId);
  const projectCount = db.prepare("SELECT COUNT(*) AS n FROM projects WHERE user_id = ?").get(userId).n;
  return { ...publicUser(row), ledger, projectCount };
}
