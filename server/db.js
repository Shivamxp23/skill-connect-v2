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

export function getAllNetworkUsers(currentUserId) {
  const users = db.prepare(`
    SELECT id, email, role, full_name, title, department, year, bio, linkedin_url, github_url 
    FROM users 
    WHERE id != ?
  `).all(currentUserId);
  
  for (let u of users) {
    const skills = db.prepare("SELECT s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?").all(u.id);
    u.skills = skills.map(s => s.name);
  }
  return users;
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

// User Registration
export function createUser(userData) {
  const existing = db.prepare("SELECT email FROM users WHERE email = ?").get(userData.email);
  if (existing) {
    throw new Error("Email already registered");
  }
  
  const id = randomUUID();
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(userData.password, salt);
  
  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, full_name, department, year) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, 
    userData.email, 
    passwordHash, 
    userData.role, 
    userData.full_name, 
    userData.department || null, 
    userData.year || null
  );
  
  return { id, email: userData.email, role: userData.role, name: userData.full_name };
}

// Profile Updates
export function updateUserProfile(userId, profileData) {
  const { title, bio, linkedin_url, github_url } = profileData;
  db.prepare(`
    UPDATE users 
    SET title = COALESCE(?, title), 
        bio = COALESCE(?, bio), 
        linkedin_url = COALESCE(?, linkedin_url), 
        github_url = COALESCE(?, github_url),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(title, bio, linkedin_url, github_url, userId);
  return { success: true };
}

// Connections
export function createConnectionRequest(requesterId, receiverId) {
  if (requesterId === receiverId) throw new Error("Cannot connect with yourself");
  
  const existing = db.prepare(`
    SELECT id FROM connections 
    WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
  `).get(requesterId, receiverId, receiverId, requesterId);
  
  if (existing) throw new Error("Connection or request already exists");

  const id = randomUUID();
  db.prepare(`
    INSERT INTO connections (id, requester_id, receiver_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(id, requesterId, receiverId);
  return { success: true, id };
}

export function updateConnectionStatus(connectionId, status) {
  db.prepare("UPDATE connections SET status = ? WHERE id = ?").run(status, connectionId);
  return { success: true };
}

export function getUserConnections(userId) {
  return db.prepare(`
    SELECT c.id as connection_id, c.status,
           CASE WHEN c.requester_id = ? THEN u2.id ELSE u1.id END as connected_user_id,
           CASE WHEN c.requester_id = ? THEN u2.full_name ELSE u1.full_name END as name,
           CASE WHEN c.requester_id = ? THEN u2.role ELSE u1.role END as role,
           CASE WHEN c.requester_id = ? THEN 'sent' ELSE 'received' END as request_type
    FROM connections c
    LEFT JOIN users u1 ON c.requester_id = u1.id
    LEFT JOIN users u2 ON c.receiver_id = u2.id
    WHERE c.requester_id = ? OR c.receiver_id = ?
  `).all(userId, userId, userId, userId, userId, userId);
}

// Projects
export function createProject(ownerId, projectData) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO projects (id, title, description, github_repo_url, owner_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, projectData.title, projectData.description, projectData.github_repo_url, ownerId);
  return { success: true, id };
}

export function getProjects() {
  return db.prepare(`
    SELECT p.*, u.full_name as owner_name, u.role as owner_role
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC
  `).all();
}

export function applyForProject(applicantId, projectId, applicationData) {
  const existing = db.prepare("SELECT id FROM project_applications WHERE project_id = ? AND applicant_id = ?").get(projectId, applicantId);
  if (existing) throw new Error("Already applied for this project");

  const id = randomUUID();
  db.prepare(`
    INSERT INTO project_applications (id, project_id, applicant_id, message, github_link)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, projectId, applicantId, applicationData.message, applicationData.github_link);
  return { success: true, id };
}

export default db;
