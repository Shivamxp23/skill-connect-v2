# Skill-Connect
SkillConnect is a full-stack web platform designed to connect students, faculty, and campus communities through skills, projects, clubs, and events. It enables users to showcase skills, collaborate on real projects, receive AI-powered skill recommendations, and build meaningful academic and professional networks within a university ecosystem.

🌟 Key Features
👤 User Roles

Student Dashboard

Administrator Dashboard

## 🧠 Skill Management
Add, edit, and categorize skills with proficiency levels
Visual skill tags and profile insights
AI-powered skill enhancement suggestions

## Networking
Discover students, faculty, mentors, and alumni
Send and manage connection requests
Filter profiles by department, skills, role, and year

## Project Collaboration
Post projects with required skills and roles
Apply to join projects with GitHub links and skill details
AI-based contributor analysis (match score, strengths, weaknesses)
Accept or reject contributors easily

## Clubs & Communities
Explore university clubs and communities
Join or leave clubs
Apply for club-specific opportunities and roles

## Events Management
View upcoming and past events
Register for workshops, seminars, and competitions
Track event participation stats

## AI Integration
AI-generated skill improvement recommendations
Mock mode available when API keys are not configured
AI-powered GitHub and contributor analysis


## Tech Stack
HTML
CSS
JavaScript
Gemini api key

## Setup and Installation

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/skillconnect.git
cd skillconnect
```

### 2️⃣ Install Backend Dependencies
```bash
cd server
npm install
```

### 3️⃣ Database (SQLite — automatic)
The app uses **SQLite** (no PostgreSQL needed). The database is created automatically when you start the server:

- Schema is based on `database/skill_connect_db.sql` (adapted for SQLite in `server/db/schema.sql`).
- Database file: `skill_connect.db` (created in the project root on first run).
- Demo users are seeded automatically: **Student** `student@skillconnect.edu` / `password` · **Faculty** `faculty@skillconnect.edu` / `password`.

Login, user skills (add/edit/delete), and profile data are stored and retrieved from this database on the live site.

### 4️⃣ Environment (optional)
- `GEMINI_API_KEY` — for AI skill suggestions and contributor analysis (optional; mock mode works without it).
- `USE_MOCK=true` — force mock AI responses.
- Create a `server/.env` file if you use these.

### 5️⃣ Run the Website (one command)
From the **project root**:
```bash
npm start
```
Or from the `server` folder:
```bash
node server.js
```
Backend and frontend run at **http://localhost:3000**. Open this URL in your browser; the server serves the site and the API.

### 6️⃣ Using the Site
Open **http://localhost:3000**. Log in with the demo accounts; skills and login are stored in the SQLite database and persist across sessions.
