// api/user/[id]/skills/[skillName].js — DELETE /api/user/:id/skills/:skillName
import { ensureSchema, deleteUserSkill } from "../../../../_db.js";
import { requireAuth } from "../../../../_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    const { id, skillName } = req.query;
    if (user.id !== id) return res.status(403).json({ success: false, error: "Unauthorized" });
    const decodedName = decodeURIComponent(skillName);
    const result = await deleteUserSkill(id, decodedName);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error || "Skill not found." });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error." });
  }
}
