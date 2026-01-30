-- Skill-Connect Database Schema (SQLite)
-- Adapted from database/skill_connect_db.sql

PRAGMA foreign_keys = ON;

-- Users and Profiles
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Skills Reference Data
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL
);

-- User's Skills and Proficiency
CREATE TABLE IF NOT EXISTS user_skills (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level TEXT NOT NULL,
    PRIMARY KEY (user_id, skill_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    github_repo_url TEXT,
    owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Skills required for a project
CREATE TABLE IF NOT EXISTS project_skills (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, skill_id)
);

-- Project Collaboration Requests / Applications
CREATE TABLE IF NOT EXISTS project_applications (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    applicant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    github_link TEXT,
    status TEXT DEFAULT 'pending',
    ai_match_score INTEGER,
    ai_analysis_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    logo_url TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Club Memberships
CREATE TABLE IF NOT EXISTS club_memberships (
    club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (club_id, user_id)
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    club_id TEXT REFERENCES clubs(id) ON DELETE SET NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (event_id, user_id)
);

-- Connections (Social Graph)
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    CHECK (requester_id != receiver_id)
);
