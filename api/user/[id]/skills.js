// api/user/[id]/skills.js — GET + POST + DELETE /api/user/:id/skills
import { ensureSchema, getUserSkills, addUserSkill, deleteUserSkill } from "../../../_db.js";
import { requireAuth } from "../../../_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  await ensureSchema();
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const skills = await getUserSkills(id);
      return res.json({ success: true, skills });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Server error." });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, category, proficiency_level } = req.body;
      if (!name || !proficiency_level) {
        return res.status(400).json({ success: false, error: "name and proficiency_level required." });
      }
      await addUserSkill(id, { name, category, proficiency_level });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Server error." });
    }
  }

  res.status(405).json({ success: false, error: "Method not allowed" });
}
