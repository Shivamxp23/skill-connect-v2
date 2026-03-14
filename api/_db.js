// api/_db.js — shared DB helper for Vercel serverless functions
// Uses @vercel/postgres (connects to Neon / Vercel Postgres)
// Run locally with DATABASE_URL pointing to your Postgres instance
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// ─── Schema bootstrap (idempotent) ───────────────────────────────────────────
// Called once on cold start; safe to run multiple times.
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      title TEXT,
      department TEXT,
      year TEXT,
      bio TEXT,
      profile_avatar_url TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS user_skills (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      proficiency_level TEXT NOT NULL,
      PRIMARY KEY (user_id, skill_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      github_repo_url TEXT,
      owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS project_skills (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, skill_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS project_applications (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      applicant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT,
      github_link TEXT,
      status TEXT DEFAULT 'pending',
      ai_match_score INTEGER,
      ai_analysis_json TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT,
      logo_url TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS club_memberships (
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (club_id, user_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      location TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS event_registrations (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      registered_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (event_id, user_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT no_self_connect CHECK (requester_id != receiver_id)
    )`;

  // Seed demo users once
  const { rows } = await sql`SELECT 1 FROM users WHERE email = 'student@skillconnect.edu' LIMIT 1`;
  if (rows.length === 0) {
    const hash = bcrypt.hashSync("password", 10);
    const demos = [
      { email: "student@skillconnect.edu", role: "student", full_name: "Shastri Namita", title: "Computer Science Student" },
      { email: "faculty@skillconnect.edu", role: "faculty", full_name: "Ms. Prachi Rajput", title: "Platform Administrator" },
    ];
    for (const u of demos) {
      await sql`
        INSERT INTO users (id, email, password_hash, role, full_name, title)
        VALUES (${randomUUID()}, ${u.email}, ${hash}, ${u.role}, ${u.full_name}, ${u.title})
        ON CONFLICT (email) DO NOTHING`;
    }
  }
}

// ─── User helpers ─────────────────────────────────────────────────────────────
export async function getUserByEmail(email) {
  const { rows } = await sql`
    SELECT id, email, password_hash, role, full_name, title, department, year
    FROM users WHERE email = ${email} LIMIT 1`;
  return rows[0] || null;
}

export async function createUser({ full_name, email, password, role, department, year }) {
  const existing = await getUserByEmail(email);
  if (existing) throw new Error("Email already registered");
  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  await sql`
    INSERT INTO users (id, email, password_hash, role, full_name, department, year)
    VALUES (${id}, ${email}, ${hash}, ${role}, ${full_name}, ${department || null}, ${year || null})`;
  return { id, email, role, name: full_name };
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export async function updateUserProfile(userId, profileData) {
  const { title, bio, linkedin_url, github_url } = profileData;
  await sql`
    UPDATE users SET
      title = COALESCE(${title}, title),
      bio = COALESCE(${bio}, bio),
      linkedin_url = COALESCE(${linkedin_url}, linkedin_url),
      github_url = COALESCE(${github_url}, github_url),
      updated_at = NOW()
    WHERE id = ${userId}`;
  return { success: true };
}

// ─── Skills ───────────────────────────────────────────────────────────────────
export async function getUserSkills(userId) {
  const { rows } = await sql`
    SELECT s.name, s.category, us.proficiency_level
    FROM user_skills us JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ${userId} ORDER BY s.name`;
  return rows;
}

async function getOrCreateSkillId(name, category) {
  const { rows } = await sql`SELECT id FROM skills WHERE name = ${name} LIMIT 1`;
  if (rows.length) return rows[0].id;
  const id = randomUUID();
  await sql`INSERT INTO skills (id, name, category) VALUES (${id}, ${name}, ${category}) ON CONFLICT (name) DO NOTHING`;
  const { rows: r2 } = await sql`SELECT id FROM skills WHERE name = ${name} LIMIT 1`;
  return r2[0].id;
}

export async function addUserSkill(userId, { name, category, proficiency_level }) {
  const skillId = await getOrCreateSkillId(name, category || "programming");
  await sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency_level)
    VALUES (${userId}, ${skillId}, ${proficiency_level})
    ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = ${proficiency_level}`;
  return { success: true };
}

export async function deleteUserSkill(userId, skillName) {
  const { rows } = await sql`SELECT id FROM skills WHERE name = ${skillName} LIMIT 1`;
  if (!rows.length) return { success: false, error: "Skill not found" };
  const { rowCount } = await sql`
    DELETE FROM user_skills WHERE user_id = ${userId} AND skill_id = ${rows[0].id}`;
  return { success: rowCount > 0 };
}

// ─── Network ──────────────────────────────────────────────────────────────────
export async function getAllNetworkUsers(currentUserId) {
  const { rows: users } = await sql`
    SELECT id, email, role, full_name, title, department, year, bio, linkedin_url, github_url
    FROM users WHERE id != ${currentUserId}`;
  for (const u of users) {
    const { rows: skills } = await sql`
      SELECT s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ${u.id}`;
    u.skills = skills.map(s => s.name);
  }
  return users;
}

// ─── Connections ──────────────────────────────────────────────────────────────
export async function createConnectionRequest(requesterId, receiverId) {
  if (requesterId === receiverId) throw new Error("Cannot connect with yourself");
  const { rows } = await sql`
    SELECT id FROM connections
    WHERE (requester_id = ${requesterId} AND receiver_id = ${receiverId})
       OR (requester_id = ${receiverId} AND receiver_id = ${requesterId}) LIMIT 1`;
  if (rows.length) throw new Error("Connection or request already exists");
  const id = randomUUID();
  await sql`INSERT INTO connections (id, requester_id, receiver_id, status) VALUES (${id}, ${requesterId}, ${receiverId}, 'pending')`;
  return { success: true, id };
}

export async function updateConnectionStatus(connectionId, status) {
  await sql`UPDATE connections SET status = ${status} WHERE id = ${connectionId}`;
  return { success: true };
}

export async function getUserConnections(userId) {
  const { rows } = await sql`
    SELECT c.id as connection_id, c.status,
      CASE WHEN c.requester_id = ${userId} THEN u2.id ELSE u1.id END as connected_user_id,
      CASE WHEN c.requester_id = ${userId} THEN u2.full_name ELSE u1.full_name END as name,
      CASE WHEN c.requester_id = ${userId} THEN u2.role ELSE u1.role END as role,
      CASE WHEN c.requester_id = ${userId} THEN 'sent' ELSE 'received' END as request_type
    FROM connections c
    LEFT JOIN users u1 ON c.requester_id = u1.id
    LEFT JOIN users u2 ON c.receiver_id = u2.id
    WHERE c.requester_id = ${userId} OR c.receiver_id = ${userId}`;
  return rows;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export async function createProject(ownerId, projectData) {
  const id = randomUUID();
  await sql`
    INSERT INTO projects (id, title, description, github_repo_url, owner_id)
    VALUES (${id}, ${projectData.title}, ${projectData.description}, ${projectData.github_repo_url || null}, ${ownerId})`;
  return { success: true, id };
}

export async function getProjects() {
  const { rows } = await sql`
    SELECT p.*, u.full_name as owner_name, u.role as owner_role
    FROM projects p LEFT JOIN users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC`;
  return rows;
}

export async function applyForProject(applicantId, projectId, applicationData) {
  const { rows } = await sql`
    SELECT id FROM project_applications WHERE project_id = ${projectId} AND applicant_id = ${applicantId} LIMIT 1`;
  if (rows.length) throw new Error("Already applied for this project");
  const id = randomUUID();
  await sql`
    INSERT INTO project_applications (id, project_id, applicant_id, message, github_link)
    VALUES (${id}, ${projectId}, ${applicantId}, ${applicationData.message || null}, ${applicationData.github_link || null})`;
  return { success: true, id };
}

export async function getProjectApplications(projectId) {
  const { rows } = await sql`
    SELECT pa.*, u.full_name as applicant_name, u.email as applicant_email, u.github_url as applicant_github
    FROM project_applications pa LEFT JOIN users u ON pa.applicant_id = u.id
    WHERE pa.project_id = ${projectId} ORDER BY pa.created_at DESC`;
  return rows;
}

export async function updateProjectApplicationStatus(appId, status, ownerId) {
  const { rows } = await sql`
    SELECT p.owner_id FROM project_applications pa
    JOIN projects p ON pa.project_id = p.id WHERE pa.id = ${appId} LIMIT 1`;
  if (!rows.length || rows[0].owner_id !== ownerId) throw new Error("Unauthorized");
  await sql`UPDATE project_applications SET status = ${status} WHERE id = ${appId}`;
  return { success: true };
}

export async function getUserProjects(userId) {
  const { rows } = await sql`
    SELECT p.*, u.full_name as owner_name,
      (SELECT COUNT(*) FROM project_applications WHERE project_id = p.id AND status = 'pending') as pending_applications
    FROM projects p LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.owner_id = ${userId} ORDER BY p.created_at DESC`;
  return rows;
}

// ─── Clubs ────────────────────────────────────────────────────────────────────
export async function getClubs(userId) {
  const { rows } = await sql`
    SELECT c.*, u.full_name as creator_name,
      (SELECT COUNT(*) FROM club_memberships WHERE club_id = c.id) as member_count,
      EXISTS(SELECT 1 FROM club_memberships WHERE club_id = c.id AND user_id = ${userId}) as is_member
    FROM clubs c LEFT JOIN users u ON c.created_by = u.id
    ORDER BY c.created_at DESC`;
  return rows;
}

export async function createClub(userId, { name, description, category }) {
  const { rows } = await sql`SELECT id FROM clubs WHERE name = ${name} LIMIT 1`;
  if (rows.length) throw new Error("Club with this name already exists");
  const id = randomUUID();
  await sql`INSERT INTO clubs (id, name, description, category, created_by) VALUES (${id}, ${name}, ${description || ''}, ${category || 'general'}, ${userId})`;
  await sql`INSERT INTO club_memberships (club_id, user_id, role) VALUES (${id}, ${userId}, 'admin')`;
  return { success: true, id };
}

export async function joinClub(userId, clubId) {
  const { rows } = await sql`SELECT 1 FROM club_memberships WHERE club_id = ${clubId} AND user_id = ${userId} LIMIT 1`;
  if (rows.length) throw new Error("Already a member");
  await sql`INSERT INTO club_memberships (club_id, user_id) VALUES (${clubId}, ${userId})`;
  return { success: true };
}

export async function leaveClub(userId, clubId) {
  await sql`DELETE FROM club_memberships WHERE club_id = ${clubId} AND user_id = ${userId}`;
  return { success: true };
}

// ─── Events ───────────────────────────────────────────────────────────────────
export async function getEvents(userId) {
  const { rows } = await sql`
    SELECT e.*, c.name as club_name,
      (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registration_count,
      EXISTS(SELECT 1 FROM event_registrations WHERE event_id = e.id AND user_id = ${userId}) as is_registered
    FROM events e LEFT JOIN clubs c ON e.club_id = c.id
    ORDER BY e.start_time ASC`;
  return rows;
}

export async function createEvent(userId, { title, description, start_time, end_time, location, club_id }) {
  const id = randomUUID();
  await sql`INSERT INTO events (id, title, description, club_id, start_time, end_time, location)
    VALUES (${id}, ${title}, ${description || ''}, ${club_id || null}, ${start_time}, ${end_time}, ${location || ''})`;
  return { success: true, id };
}

export async function registerForEvent(userId, eventId) {
  const { rows } = await sql`SELECT 1 FROM event_registrations WHERE event_id = ${eventId} AND user_id = ${userId} LIMIT 1`;
  if (rows.length) throw new Error("Already registered");
  await sql`INSERT INTO event_registrations (event_id, user_id) VALUES (${eventId}, ${userId})`;
  return { success: true };
}

export async function unregisterFromEvent(userId, eventId) {
  await sql`DELETE FROM event_registrations WHERE event_id = ${eventId} AND user_id = ${userId}`;
  return { success: true };
}

// ─── User Stats ───────────────────────────────────────────────────────────────
export async function getUserStats(userId) {
  const { rows: [c] } = await sql`SELECT COUNT(*) as count FROM connections WHERE (requester_id = ${userId} OR receiver_id = ${userId}) AND status = 'accepted'`;
  const { rows: [p] } = await sql`SELECT COUNT(*) as count FROM projects WHERE owner_id = ${userId}`;
  const { rows: [s] } = await sql`SELECT COUNT(*) as count FROM user_skills WHERE user_id = ${userId}`;
  const { rows: [cl] } = await sql`SELECT COUNT(*) as count FROM club_memberships WHERE user_id = ${userId}`;
  return { connections: Number(c.count), projects: Number(p.count), skills: Number(s.count), clubs: Number(cl.count) };
}
