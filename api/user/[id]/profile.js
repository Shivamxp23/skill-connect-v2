// api/user/[id]/profile.js — PUT /api/user/:id/profile
import { ensureSchema, updateUserProfile } from "../../../_db.js";
import { requireAuth } from "../../../_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "PUT") return res.status(405).json({ success: false, error: "Method not allowed" });

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    const { id } = req.query;
    if (user.id !== id) return res.status(403).json({ success: false, error: "Unauthorized" });
    await updateUserProfile(id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
}
