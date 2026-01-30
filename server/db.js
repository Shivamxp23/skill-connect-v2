import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const __dirname = dirname(fileURLToPath(import.meta.url));

// DB file next to server folder (project root) or in server folder
const dbPath = join(__dirname, "..", "skill_connect.db");
const db = new Database(dbPath);

function runSchema() {
  const schemaPath = join(__dirname, "db", "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  db.exec(sql);
}

function seedDemoUsers() {
  const existing = db.prepare("SELECT 1 FROM users WHERE email = ?").get("student@skillconnect.edu");
  if (existing) return;

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync("password", salt);

  const demos = [
    { email: "student@skillconnect.edu", role: "student", full_name: "Shastri Namita", title: "Computer Science Student" },
    { email: "faculty@skillconnect.edu", role: "faculty", full_name: "Ms. Prachi Rajput", title: "Platform Administrator" },
  ];

  const insert = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, full_name, title)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const u of demos) {
    insert.run(randomUUID(), u.email, passwordHash, u.role, u.full_name, u.title);
  }
}

// Initialize DB on load
try {
  runSchema();
  seedDemoUsers();
  console.log("Database initialized at", dbPath);
} catch (err) {
  console.error("DB init error:", err);
  throw err;
}

// --- API helpers ---

export function getUserByEmail(email) {
  const row = db
    .prepare(
      "SELECT id, email, password_hash, role, full_name, title, department, year FROM users WHERE email = ?"
    )
    .get(email);
  return row || null;
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function getUserById(id) {
  const row = db
    .prepare(
      "SELECT id, email, role, full_name, title, department, year FROM users WHERE id = ?"
    )
    .get(id);
  return row || null;
}

export function getUserSkills(userId) {
  const rows = db
    .prepare(
      `
    SELECT s.name, s.category, us.proficiency_level
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ?
    ORDER BY s.name
  `
    )
    .all(userId);
  return rows;
}

function getOrCreateSkillId(name, category) {
  let row = db.prepare("SELECT id FROM skills WHERE name = ?").get(name);
  if (row) return row.id;
  const id = randomUUID();
  db.prepare("INSERT INTO skills (id, name, category) VALUES (?, ?, ?)").run(
    id,
    name,
    category
  );
  return id;
}

export function addUserSkill(userId, { name, category, proficiency_level }) {
  const skillId = getOrCreateSkillId(name, category || "programming");
  db.prepare(
    `
    INSERT OR REPLACE INTO user_skills (user_id, skill_id, proficiency_level)
    VALUES (?, ?, ?)
  `
  ).run(userId, skillId, proficiency_level);
  return { success: true };
}

export function deleteUserSkill(userId, skillName) {
  const skill = db.prepare("SELECT id FROM skills WHERE name = ?").get(skillName);
  if (!skill) return { success: false, error: "Skill not found" };
  const result = db
    .prepare("DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?")
    .run(userId, skill.id);
  return { success: result.changes > 0 };
}

export default db;
