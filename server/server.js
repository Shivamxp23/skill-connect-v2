import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  getUserByEmail,
  verifyPassword,
  getUserSkills,
  addUserSkill,
  deleteUserSkill,
  createUser,
  updateUserProfile,
  createConnectionRequest,
  updateConnectionStatus,
  getUserConnections,
  createProject,
  getProjects,
  applyForProject,
  getAllNetworkUsers,
  getProjectApplications,
  updateProjectApplicationStatus,
  getUserProjects,
  getClubs,
  createClub,
  joinClub,
  leaveClub,
  getEvents,
  createEvent,
  registerForEvent,
  unregisterFromEvent,
  getUserStats
} from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from project root (parent of server/)
const staticDir = path.join(__dirname, "..");
app.use(express.static(staticDir));

// give basic startup info
console.log("Starting backend...");

const USE_MOCK = process.env.USE_MOCK === "true";

// Only create Gemini client if API key present and not forcing mock
let genAI = null;
if (!USE_MOCK && process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Gemini client initialized.");
  } catch (err) {
    console.error("Failed to initialize Gemini client:", err);
  }
} else {
  console.log("Running in MOCK mode (no Gemini client). Set GEMINI_API_KEY to enable real AI.");
}

// Health check (for API clients)
app.get("/health", (req, res) => {
  res.json({ status: "ok", mock: USE_MOCK, gemini: !!genAI });
});

// SPA: serve index.html for non-API routes so the app loads when opening the site
app.get("/", (req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

// Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, error: "Access denied" });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: "Invalid token" });
    req.user = user;
    next();
  });
}

// ---------- Database API ----------

// Register
app.post("/api/register", (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }
    
    try {
      const newUser = createUser({ full_name: name, email, password, role, department });
      const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({
        success: true,
        token,
        user: newUser
      });
    } catch (e) {
      if (e.message === "Email already registered") {
         return res.status(400).json({ success: false, error: e.message });
      }
      throw e;
    }
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// Login
app.post("/api/login", (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required." });
    }
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Please log in as ${user.role}. You selected ${role}.`,
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        title: user.title || "",
        role: user.role,
        department: user.department || "",
        bio: user.bio || "",
        linkedin_url: user.linkedin_url || "",
        github_url: user.github_url || ""
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// --- OAuth Routes ---
const oauthStates = new Map();

// GitHub OAuth
app.get("/api/auth/github", authenticateToken, (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  oauthStates.set(state, req.user.id);
  
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(500).json({ success: false, error: "Missing GITHUB_CLIENT_ID in .env" });
  
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=read:user`;
  
  res.json({ success: true, url });
});

app.get("/api/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;
  const userId = oauthStates.get(state);
  
  if (!userId) {
     return res.status(400).send("Invalid or expired OAuth state. Please try connecting again.");
  }
  oauthStates.delete(state);

  try {
     const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
           "Content-Type": "application/json",
           "Accept": "application/json"
        },
        body: JSON.stringify({
           client_id: process.env.GITHUB_CLIENT_ID,
           client_secret: process.env.GITHUB_CLIENT_SECRET,
           code,
           redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`
        })
     });
     
     const tokenData = await tokenRes.json();
     if (tokenData.error) throw new Error(tokenData.error_description);

     const userRes = await fetch("https://api.github.com/user", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` }
     });
     const githubUser = await userRes.json();
     
     updateUserProfile(userId, { github_url: githubUser.html_url });
     res.redirect('/?oauth_success=github');
  } catch (err) {
     console.error("GitHub OAuth error:", err);
     res.status(500).send("Failed to authenticate with GitHub");
  }
});

// LinkedIn OAuth
app.get("/api/auth/linkedin", authenticateToken, (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  oauthStates.set(state, req.user.id);
  
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) return res.status(500).json({ success: false, error: "Missing LINKEDIN_CLIENT_ID in .env" });
  
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`;
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=openid%20profile%20email`;
  
  res.json({ success: true, url });
});

app.get("/api/auth/linkedin/callback", async (req, res) => {
  const { code, state } = req.query;
  const userId = oauthStates.get(state);
  
  if (!userId) {
     return res.status(400).send("Invalid or expired OAuth state. Please try connecting again.");
  }
  oauthStates.delete(state);

  try {
     const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
           grant_type: "authorization_code",
           code,
           redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`,
           client_id: process.env.LINKEDIN_CLIENT_ID,
           client_secret: process.env.LINKEDIN_CLIENT_SECRET
        })
     });
     
     const tokenData = await tokenRes.json();
     if (tokenData.error) throw new Error(tokenData.error_description);

     const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` }
     });
     const liUser = await userRes.json();
     
     updateUserProfile(userId, { linkedin_url: `https://linkedin.com/in/connected-${liUser.sub}` });
     res.redirect('/?oauth_success=linkedin');
  } catch (err) {
     console.error("LinkedIn OAuth error:", err);
     res.status(500).send("Failed to authenticate with LinkedIn");
  }
});


// Get user skills
app.get("/api/user/:id/skills", (req, res) => {
  try {
    const { id } = req.params;
    const skills = getUserSkills(id);
    res.json({ success: true, skills });
  } catch (err) {
    console.error("Get skills error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// Add user skill
app.post("/api/user/:id/skills", (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, proficiency_level } = req.body;
    if (!name || !proficiency_level) {
      return res.status(400).json({ success: false, error: "name and proficiency_level required." });
    }
    addUserSkill(id, { name, category, proficiency_level });
    res.json({ success: true });
  } catch (err) {
    console.error("Add skill error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// Delete user skill (by skill name)
app.delete("/api/user/:id/skills/:skillName", authenticateToken, (req, res) => {
  try {
    const { id, skillName } = req.params;
    if (req.user.id !== id) return res.status(403).json({ success: false, error: "Unauthorized" });
    const decodedName = decodeURIComponent(skillName);
    const result = deleteUserSkill(id, decodedName);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error || "Skill not found." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete skill error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// Profile Update
app.put("/api/user/:id/profile", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) return res.status(403).json({ success: false, error: "Unauthorized" });
    
    updateUserProfile(id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// Connections
app.get("/api/connections", authenticateToken, (req, res) => {
  try {
    const connections = getUserConnections(req.user.id);
    res.json({ success: true, connections });
  } catch (err) {
    console.error("Get connections error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/connections/request", authenticateToken, (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ success: false, error: "receiverId required" });
    
    const result = createConnectionRequest(req.user.id, receiverId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/api/connections/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    const result = updateConnectionStatus(id, status);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Network Users
app.get("/api/users", authenticateToken, (req, res) => {
  try {
    const users = getAllNetworkUsers(req.user.id);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Projects
app.get("/api/projects", authenticateToken, (req, res) => {
  try {
    const projects = getProjects();
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/projects", authenticateToken, (req, res) => {
  try {
    const projectData = req.body;
    if (!projectData.title || !projectData.description) {
      return res.status(400).json({ success: false, error: "Title and description required" });
    }
    const result = createProject(req.user.id, projectData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/projects/:id/apply", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const applicationData = req.body;
    const result = applyForProject(req.user.id, id, applicationData);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/projects/:id/applications", authenticateToken, (req, res) => {
  try {
    const apps = getProjectApplications(req.params.id);
    res.json({ success: true, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.put("/api/projects/:projectId/applications/:appId", authenticateToken, (req, res) => {
  try {
    const { appId } = req.params;
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    const result = updateProjectApplicationStatus(appId, status, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/user/:id/projects", authenticateToken, (req, res) => {
  try {
    const projects = getUserProjects(req.params.id);
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// User Stats
app.get("/api/user/:id/stats", authenticateToken, (req, res) => {
  try {
    const stats = getUserStats(req.params.id);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Clubs
app.get("/api/clubs", authenticateToken, (req, res) => {
  try {
    const clubs = getClubs(req.user.id);
    res.json({ success: true, clubs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/clubs", authenticateToken, (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name required" });
    const result = createClub(req.user.id, { name, description, category });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/clubs/:id/join", authenticateToken, (req, res) => {
  try {
    const result = joinClub(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/clubs/:id/leave", authenticateToken, (req, res) => {
  try {
    const result = leaveClub(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Events
app.get("/api/events", authenticateToken, (req, res) => {
  try {
    const events = getEvents(req.user.id);
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/events", authenticateToken, (req, res) => {
  try {
    const { title, description, start_time, end_time, location, club_id } = req.body;
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: "title, start_time, end_time required" });
    }
    const result = createEvent(req.user.id, { title, description, start_time, end_time, location, club_id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/events/:id/register", authenticateToken, (req, res) => {
  try {
    const result = registerForEvent(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/events/:id/unregister", authenticateToken, (req, res) => {
  try {
    const result = unregisterFromEvent(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Skill enhancement endpoint 
app.post("/ai/skills", async (req, res) => {
  try {
    const { skills } = req.body;

    if (!genAI) {
      // Return a mock-friendly response if gemini not configured
      return res.json({
        success: true,
        suggestions: `Mock suggestions because GEMINI_API_KEY is not set. Provided skills: ${skills.map(s => s.name + "(" + s.level + ")").join(", ")}`
      });
    }

    const prompt = `
You are an AI career mentor. Using the user's skill levels, suggest what they should learn next.
Keep the output in 5–8 simple bullet points.

User Skills:
${skills.map(s => `• ${s.name} (${s.level})`).join("\n")}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.4
      }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ success: true, suggestions: text });
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ success: false, error: "AI backend error" });
  }
});

// Project Collaboration — AI Applicant Analysis
app.post("/ai/analyse-collab", async (req, res) => {
  try {
    console.log("Received /ai/analyse-collab request:", {
      bodyPreview: {
        applicantName: req.body.applicantName,
        applicantGithub: req.body.applicantGithub ? req.body.applicantGithub.slice(0, 80) : null,
        requiredSkills: req.body.requiredSkills
      }
    });

    const { applicantGithub = "Not provided", requiredSkills = [], applicantName = "Applicant" } = req.body;

    // If no Gemini client, return a example mock to allow frontend testing
    if (!genAI) {
      const mockScore = 78;
      return res.json({
        matchScore: mockScore,
        strengths: ["Clear repo structure", "Good README", "Relevant libraries used"],
        weaknesses: ["Missing tests", "Sparse documentation in some modules"],
        repoQuality: "Good",
        recommendation: mockScore >= 70 ? "Suitable" : "May not be suitable",
        details: `This is a MOCK analysis because GEMINI_API_KEY is not set on the server. Applicant: ${applicantName}, Repo: ${applicantGithub}`
      });
    }

    // Real Gemini analysis
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an AI evaluating a contributor for a software project.
You MUST give a VERY SHORT response. Do NOT add long explanations.

Applicant:
Name: ${applicantName}
GitHub: ${applicantGithub}
Required Skills: ${requiredSkills.join(", ")}

RETURN THE ANSWER ONLY IN THIS EXACT FORMAT.  
ABSOLUTELY NO EXTRA TEXT, NO EXTRA SECTIONS:

MATCH SCORE: <number only>

STRENGTHS:
- <max 2 bullets>

WEAKNESSES:
- <max 2 bullets>

REPO QUALITY: <one-word rating: Excellent, Good, Average, Poor>

RECOMMENDATION: <Suitable / Borderline / Not Suitable>

DETAILS: <ONE sentence ONLY. No more.>

CONCLUSION: <2-3 sentence on what decision should user make.>

RULES:
- DO NOT add improvement lists.
- DO NOT add analysis paragraphs.
- DO NOT add introductions or conclusions.
- DO NOT output more than what is required.
- Keep everything as short as possible.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const response = {
      matchScore: extractNumber(text, "MATCH SCORE") || null,
      strengths: extractList(text, "STRENGTHS"),
      weaknesses: extractList(text, "WEAKNESSES"),
      repoQuality: extractLine(text, "REPO QUALITY"),
      recommendation: extractLine(text, "RECOMMENDATION"),
      details: extractSection(text, "DETAILS"),
      conclusion: extractSection(text, "CONCLUSION"),
    };

    // Fix case where Gemini puts CONCLUSION inside DETAILS
    if (response.details && response.details.includes("CONCLUSION:")) {
      const parts = response.details.split(/CONCLUSION:/i);
      response.details = parts[0].trim();
      response.conclusion = parts[1].trim();
    }


    res.json(response);

  } catch (err) {
    console.error("AI Analyse Error:", err);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

// parsing function
function extractLine(text, key) {
  const match = text.match(new RegExp(`${key}:\\s*(.*)`, "i"));
  return match ? match[1].trim() : "";
}

function extractNumber(text, key) {
  const line = extractLine(text, key);
  const num = parseInt(line);
  return isNaN(num) ? null : num;
}

function extractList(text, key) {
  const splitIndex = text.toUpperCase().indexOf(key.toUpperCase() + ":");
  if (splitIndex === -1) return [];
  const rest = text.slice(splitIndex + key.length + 1);
  // stop at next all-caps label if present
  const stop = rest.search(/\n[A-Z\s]{3,30}:/);
  const section = stop === -1 ? rest : rest.slice(0, stop);
  return section
    .split(/\r?\n/)
    .map(l => l.replace(/^[\-\•\*\s]+/, "").trim())
    .filter(l => l.length > 0);
}

function extractSection(text, key) {
  const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]{3,20}:|$)`, "i");
  const match = text.match(regex);

  if (!match) return "";

  return match[1].trim();
}


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}  (mock=${USE_MOCK})`));
