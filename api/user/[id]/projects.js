// api/user/[id]/projects.js — GET /api/user/:id/projects
import { ensureSchema, getUserProjects } from "../../../_db.js";
import { requireAuth } from "../../../_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureSchema();
    const projects = await getUserProjects(req.query.id);
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
}
