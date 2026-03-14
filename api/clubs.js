// api/clubs.js — GET + POST /api/clubs
import { ensureSchema, getClubs, createClub } from "./_db.js";
import { requireAuth } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  await ensureSchema();

  if (req.method === "GET") {
    try {
      const clubs = await getClubs(user.id);
      return res.json({ success: true, clubs });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, description, category } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Name required" });
      const result = await createClub(user.id, { name, description, category });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  res.status(405).json({ success: false, error: "Method not allowed" });
}
