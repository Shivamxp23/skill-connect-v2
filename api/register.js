// api/register.js
import jwt from "jsonwebtoken";
import { ensureSchema, createUser } from "./_db.js";
import { JWT_SECRET } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    await ensureSchema();
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }
    try {
      const newUser = await createUser({ full_name: name, email, password, role, department });
      const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ success: true, token, user: newUser });
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
}
