// api/[...slug].js — Single catch-all handler (consolidates all routes for Vercel Hobby plan)
import jwt from "jsonwebtoken";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import * as db from "./_db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here";
const oauthStates = new Map();

function getUser(req) {
  const auth = req.headers["authorization"];
  const token = auth && auth.split(" ")[1];
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function auth(req, res) {
  const user = getUser(req);
  if (!user) { res.status(401).json({ success: false, error: "Access denied" }); return null; }
  return user;
}
function extractLine(text, key) {
  const match = text.match(new RegExp(`${key}:\\s*(.*)`, "i"));
  return match ? match[1].trim() : "";
}
function extractNumber(text, key) { const n = parseInt(extractLine(text, key)); return isNaN(n) ? null : n; }
function extractList(text, key) {
  const i = text.toUpperCase().indexOf(key.toUpperCase() + ":");
  if (i === -1) return [];
  const rest = text.slice(i + key.length + 1);
  const stop = rest.search(/\n[A-Z\s]{3,30}:/);
  return (stop === -1 ? rest : rest.slice(0, stop)).split(/\r?\n/).map(l => l.replace(/^[-•*\s]+/, "").trim()).filter(Boolean);
}
function extractSection(text, key) {
  const m = text.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]{3,20}:|$)`, "i"));
  return m ? m[1].trim() : "";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  let slugArray = [];
  if (req.query.slug) {
    if (Array.isArray(req.query.slug)) {
      slugArray = req.query.slug.flatMap(s => s.split("/"));
    } else {
      slugArray = req.query.slug.split("/");
    }
  }
  const [r0, r1, r2, r3] = slugArray.filter(Boolean);
  const M = req.method;

  try {
    await db.ensureSchema();

    // Health
    if (!r0 || r0 === "health") return res.json({ status: "ok", gemini: !!process.env.GEMINI_API_KEY });

    // AI routes (via /ai/* → /api/ai/* rewrite)
    if (r0 === "ai") {
      if (r1 === "skills" && M === "POST") {
        const { skills } = req.body;
        if (!process.env.GEMINI_API_KEY) return res.json({ success: true, suggestions: `Mock: ${skills.map(s => s.name).join(", ")}` });
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.4 } });
        const result = await model.generateContent(`You are an AI career mentor. Suggest what to learn next in 5-8 bullets.\n\nSkills:\n${skills.map(s => `• ${s.name} (${s.level})`).join("\n")}`);
        return res.json({ success: true, suggestions: result.response.text() });
      }
      if (r1 === "analyse-collab" && M === "POST") {
        const { applicantGithub = "Not provided", requiredSkills = [], applicantName = "Applicant" } = req.body;
        if (!process.env.GEMINI_API_KEY) return res.json({ matchScore: 78, strengths: ["Clear repo structure", "Good README"], weaknesses: ["Missing tests"], repoQuality: "Good", recommendation: "Suitable", details: `MOCK. Applicant: ${applicantName}` });
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Evaluate contributor. VERY SHORT.\nApplicant: ${applicantName}\nGitHub: ${applicantGithub}\nRequired Skills: ${requiredSkills.join(", ")}\n\nFormat:\nMATCH SCORE: <number>\nSTRENGTHS:\n- <2 bullets>\nWEAKNESSES:\n- <2 bullets>\nREPO QUALITY: <word>\nRECOMMENDATION: <Suitable/Borderline/Not Suitable>\nDETAILS: <1 sentence>\nCONCLUSION: <2-3 sentences>`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const response = { matchScore: extractNumber(text, "MATCH SCORE"), strengths: extractList(text, "STRENGTHS"), weaknesses: extractList(text, "WEAKNESSES"), repoQuality: extractLine(text, "REPO QUALITY"), recommendation: extractLine(text, "RECOMMENDATION"), details: extractSection(text, "DETAILS"), conclusion: extractSection(text, "CONCLUSION") };
        if (response.details?.includes("CONCLUSION:")) { const p = response.details.split(/CONCLUSION:/i); response.details = p[0].trim(); response.conclusion = p[1].trim(); }
        return res.json(response);
      }
    }

    // Register
    if (r0 === "register" && M === "POST") {
      const { name, email, password, role, department } = req.body;
      if (!name || !email || !password || !role) return res.status(400).json({ success: false, error: "Missing required fields." });
      try {
        const newUser = await db.createUser({ full_name: name, email, password, role, department });
        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
        return res.json({ success: true, token, user: newUser });
      } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
      }
    }

    // Login
    if (r0 === "login" && M === "POST") {
      const { email, password, role } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required." });
      const user = await db.getUserByEmail(email);
      if (!user || !db.verifyPassword(password, user.password_hash)) return res.status(401).json({ success: false, error: "Invalid email or password." });
      if (role && user.role !== role) return res.status(403).json({ success: false, error: `Please log in as ${user.role}.` });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
      return res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.full_name, title: user.title || "", role: user.role, department: user.department || "", bio: user.bio || "", linkedin_url: user.linkedin_url || "", github_url: user.github_url || "" } });
    }

    // OAuth
    if (r0 === "auth") {
      const APP_URL = process.env.APP_URL || "https://skill-connect-v2.vercel.app";
      if (r1 === "github" && !r2 && M === "GET") {
        const user = auth(req, res); if (!user) return;
        const state = crypto.randomBytes(16).toString("hex");
        oauthStates.set(state, user.id);
        if (!process.env.GITHUB_CLIENT_ID) return res.status(500).json({ success: false, error: "Missing GITHUB_CLIENT_ID" });
        return res.json({ success: true, url: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(APP_URL + "/api/auth/github/callback")}&state=${state}&scope=read:user` });
      }
      if (r1 === "github" && r2 === "callback" && M === "GET") {
        const { code, state } = req.query;
        const userId = oauthStates.get(state);
        if (!userId) return res.status(400).send("Invalid OAuth state.");
        oauthStates.delete(state);
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: APP_URL + "/api/auth/github/callback" }) });
        const tokenData = await tokenRes.json();
        if (tokenData.error) return res.status(500).send("GitHub auth failed");
        const ghUser = await (await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${tokenData.access_token}` } })).json();
        await db.updateUserProfile(userId, { github_url: ghUser.html_url });
        return res.redirect("/?oauth_success=github");
      }
      if (r1 === "linkedin" && !r2 && M === "GET") {
        const user = auth(req, res); if (!user) return;
        const state = crypto.randomBytes(16).toString("hex");
        oauthStates.set(state, user.id);
        if (!process.env.LINKEDIN_CLIENT_ID) return res.status(500).json({ success: false, error: "Missing LINKEDIN_CLIENT_ID" });
        return res.json({ success: true, url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(APP_URL + "/api/auth/linkedin/callback")}&state=${state}&scope=openid%20profile%20email` });
      }
      if (r1 === "linkedin" && r2 === "callback" && M === "GET") {
        const { code, state } = req.query;
        const userId = oauthStates.get(state);
        if (!userId) return res.status(400).send("Invalid OAuth state.");
        oauthStates.delete(state);
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: APP_URL + "/api/auth/linkedin/callback", client_id: process.env.LINKEDIN_CLIENT_ID, client_secret: process.env.LINKEDIN_CLIENT_SECRET }) });
        const tokenData = await tokenRes.json();
        if (tokenData.error) return res.status(500).send("LinkedIn auth failed");
        const liUser = await (await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tokenData.access_token}` } })).json();
        await db.updateUserProfile(userId, { linkedin_url: `https://linkedin.com/in/connected-${liUser.sub}` });
        return res.redirect("/?oauth_success=linkedin");
      }
    }

    // Users
    if (r0 === "users" && M === "GET") {
      const user = auth(req, res); if (!user) return;
      return res.json({ success: true, users: await db.getAllNetworkUsers(user.id) });
    }

    // Connections
    if (r0 === "connections") {
      const user = auth(req, res); if (!user) return;
      if (!r1 && M === "GET") return res.json({ success: true, connections: await db.getUserConnections(user.id) });
      if ((!r1 || r1 === "request") && M === "POST") {
        const { receiverId } = req.body;
        if (!receiverId) return res.status(400).json({ success: false, error: "receiverId required" });
        try { return res.json(await db.createConnectionRequest(user.id, receiverId)); }
        catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      }
      if (r1 && M === "PUT") {
        const { status } = req.body;
        if (!["accepted", "declined"].includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
        return res.json(await db.updateConnectionStatus(r1, status));
      }
    }

    // Projects
    if (r0 === "projects") {
      const user = auth(req, res); if (!user) return;
      if (!r1 && M === "GET") return res.json({ success: true, projects: await db.getProjects() });
      if (!r1 && M === "POST") {
        if (!req.body.title || !req.body.description) return res.status(400).json({ success: false, error: "Title and description required" });
        return res.json(await db.createProject(user.id, req.body));
      }
      if (r1 && r2 === "apply" && M === "POST") {
        try { return res.json(await db.applyForProject(user.id, r1, req.body)); }
        catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      }
      if (r1 && r2 === "applications" && !r3 && M === "GET") return res.json({ success: true, applications: await db.getProjectApplications(r1) });
      if (r1 && r2 === "applications" && r3 && M === "PUT") {
        const { status } = req.body;
        if (!["accepted", "declined"].includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
        try { return res.json(await db.updateProjectApplicationStatus(r3, status, user.id)); }
        catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      }
    }

    // User
    if (r0 === "user") {
      const user = auth(req, res); if (!user) return;
      const uid = r1; const sub = r2;
      if (sub === "skills") {
        if (!r3 && M === "GET") return res.json({ success: true, skills: await db.getUserSkills(uid) });
        if (!r3 && M === "POST") {
          const { name, category, proficiency_level } = req.body;
          if (!name || !proficiency_level) return res.status(400).json({ success: false, error: "name and proficiency_level required." });
          await db.addUserSkill(uid, { name, category, proficiency_level });
          return res.json({ success: true });
        }
        if (r3 && M === "DELETE") {
          if (user.id !== uid) return res.status(403).json({ success: false, error: "Unauthorized" });
          const result = await db.deleteUserSkill(uid, decodeURIComponent(r3));
          return result.success ? res.json({ success: true }) : res.status(404).json({ success: false, error: result.error });
        }
      }
      if (sub === "profile" && M === "PUT") {
        if (user.id !== uid) return res.status(403).json({ success: false, error: "Unauthorized" });
        await db.updateUserProfile(uid, req.body);
        return res.json({ success: true });
      }
      if (sub === "stats" && M === "GET") return res.json({ success: true, stats: await db.getUserStats(uid) });
      if (sub === "projects" && M === "GET") return res.json({ success: true, projects: await db.getUserProjects(uid) });
    }

    // Clubs
    if (r0 === "clubs") {
      const user = auth(req, res); if (!user) return;
      if (!r1 && M === "GET") return res.json({ success: true, clubs: await db.getClubs(user.id) });
      if (!r1 && M === "POST") {
        const { name, description, category } = req.body;
        if (!name) return res.status(400).json({ success: false, error: "Name required" });
        try { return res.json(await db.createClub(user.id, { name, description, category })); }
        catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      }
      if (r1 && r2 === "join" && M === "POST") {
        try { return res.json(await db.joinClub(user.id, r1)); }
        catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      }
      if (r1 && r2 === "leave" && M === "POST") return res.json(await db.leaveClub(user.id, r1));
    }

    // Events
    if (r0 === "events") {
      const user = auth(req, res); if (!user) return;
      if (!r1 && M === "GET") return res.json({ success: true, events: await db.getEvents(user.id) });
      if (!r1 && M === "POST") {
        const { title, start_time, end_time } = req.body;
        if (!title || !start_time || !end_time) return res.status(400).json({ success: false, error: "title, start_time, end_time required" });
        try { return res.json(await db.createEvent(user.id, req.body)); }
        catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      }
      if (r1 && r2 === "register" && M === "POST") {
        try { return res.json(await db.registerForEvent(user.id, r1)); }
        catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      }
      if (r1 && r2 === "unregister" && M === "POST") return res.json(await db.unregisterFromEvent(user.id, r1));
    }

    return res.status(404).json({ success: false, error: "Not found", path: req.query.slug });
  } catch (err) {
    console.error("API error:", err);
    // Return detailed errors to help debug Vercel deployment issues
    const errorMessage = err.message || "Unknown Server Error";
    let helpfulHint = "";
    
    if (errorMessage.includes("POSTGRES_URL") || errorMessage.includes("NeonDbError") || errorMessage.includes("database")) {
      helpfulHint = "Vercel Postgres is not configured properly. Did you link the Neon database in Vercel Storage and add the POSTGRES_URL environment variable?";
    }
    
    return res.status(500).json({ 
      success: false, 
      error: "Server error", 
      details: errorMessage,
      hint: helpfulHint || undefined
    });
  }
}
