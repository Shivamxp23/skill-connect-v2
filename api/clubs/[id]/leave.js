// api/clubs/[id]/leave.js — POST /api/clubs/:id/leave
import { ensureSchema, leaveClub } from "../../../_db.js";
import { requireAuth } from "../../../_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    const result = await leaveClub(user.id, req.query.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
}
