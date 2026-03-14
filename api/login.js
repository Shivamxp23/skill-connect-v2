// api/login.js
import jwt from "jsonwebtoken";
import { ensureSchema, getUserByEmail, verifyPassword } from "./_db.js";
import { JWT_SECRET } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    await ensureSchema();
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required." });
    }
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ success: false, error: "Invalid email or password." });
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ success: false, error: `Please log in as ${user.role}. You selected ${role}.` });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      success: true, token,
      user: {
        id: user.id, email: user.email, name: user.full_name,
        title: user.title || "", role: user.role, department: user.department || "",
        bio: user.bio || "", linkedin_url: user.linkedin_url || "", github_url: user.github_url || ""
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
}
