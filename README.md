# 🎓 Skill-Connect

**SkillConnect** is a full-stack web platform that connects students, faculty, and campus communities through skills, projects, clubs, and events. Built with HTML, CSS, JavaScript, and a Node.js + SQLite backend — with Gemini AI integration for smart skill recommendations and contributor analysis.

---

## ✨ Features

| Feature | Description |
|---|---|
| 👤 **User Roles** | Student & Administrator dashboards |
| 🧠 **Skill Management** | Add, edit, and categorize skills with proficiency levels + AI suggestions |
| 🌐 **Networking** | Discover and connect with students, faculty, and alumni |
| 🚀 **Project Collaboration** | Post projects, apply with GitHub links, AI-powered contributor analysis |
| 🏛️ **Clubs & Communities** | Join/leave clubs and apply for roles |
| 📅 **Events** | Browse, register, and track campus events |
| 🤖 **AI Integration** | Gemini-powered skill recommendations and GitHub analysis |

---

## 🛠️ Tech Stack

- **Frontend** — HTML, CSS, Vanilla JavaScript
- **Backend** — Node.js, Express.js
- **Database** — SQLite (via `better-sqlite3`) — *no setup required*
- **AI** — Google Gemini API
- **Auth** — JWT (JSON Web Tokens)

---

## 🚀 How to Run

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or above)
- npm (comes with Node.js)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/skillconnect.git
cd skillconnect
```

---

### Step 2 — Install Backend Dependencies

```bash
cd server
npm install
```

---

### Step 3 — Configure Environment Variables

Inside the `server/` folder, create a `.env` file (or edit the existing one):

```
server/.env
```

Fill it in like this:

```env
# Required for JWT authentication (generate a random secret)
JWT_SECRET=your_random_secret_here

# Required for AI features (get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: GitHub OAuth (https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional: LinkedIn OAuth (https://developer.linkedin.com/)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# App base URL (keep as-is for local dev)
APP_URL=http://localhost:3000
```

#### 🔑 Generating a JWT_SECRET

Run this command to generate a secure random secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as the value of `JWT_SECRET`.

> ℹ️ `GEMINI_API_KEY` is optional. Without it, the app runs in **mock mode** — all AI responses will be placeholder text.

---

### Step 4 — Run the Server

From inside the `server/` folder:

```bash
node server.js
```

Or from the **project root**:

```bash
npm start
```

You should see:

```
Starting backend...
Gemini client initialized.
Backend running on http://localhost:3000  (mock=false)
```

---

### Step 5 — Open the App

Open your browser and go to:

```
http://localhost:3000
```

The server serves both the **frontend website** and the **backend API** from the same port.

---

## 🔐 Demo Accounts

The database is seeded automatically on first run with these test accounts:

| Role | Email | Password |
|---|---|---|
| Student | `student@skillconnect.edu` | `password` |
| Faculty | `faculty@skillconnect.edu` | `password` |

---

## 🗄️ Database

- Uses **SQLite** — no PostgreSQL or external database needed.
- The database file `skill_connect.db` is created automatically in the project root on first run.
- All data (users, skills, projects, clubs, events) persists across server restarts.

---

## 🤖 AI Modes

| Mode | How to activate | Behaviour |
|---|---|---|
| **Real AI** | Set `GEMINI_API_KEY` in `.env` | Uses Google Gemini for smart suggestions |
| **Mock mode** | Leave `GEMINI_API_KEY` empty, or set `USE_MOCK=true` | Returns placeholder AI responses — no API key needed |

---

## 📁 Project Structure

```
Skill-Connect/
├── index.html          # Main frontend (Single Page App)
├── styles.css          # Global styles
├── script.js           # Frontend logic
├── skill_connect.db    # SQLite database (auto-created)
├── package.json        # Root package (npm start script)
└── server/
    ├── server.js       # Express backend + all API routes
    ├── db.js           # Database queries & helper functions
    ├── db/             # SQLite schema files
    ├── .env            # Environment variables (DO NOT commit this)
    └── package.json    # Backend dependencies
```

---

## ⚠️ Important Notes

- **Never commit `.env`** to GitHub — it contains secret keys. It is already listed in `.gitignore`.
- The app runs fully on `localhost:3000` — no separate frontend dev server needed.
- If you see `mock=true` in the terminal, your `GEMINI_API_KEY` is not set — AI features will use placeholder responses.
