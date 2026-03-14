// api/projects/[id].js — /api/projects/:id/apply and /api/projects/:id/applications
import {
  ensureSchema, applyForProject, getProjectApplications, updateProjectApplicationStatus
} from "../_db.js";
import { requireAuth } from "../_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  await ensureSchema();

  const { id } = req.query;
  // The URL pattern can be /api/projects/:id/apply or /api/projects/:id/applications
  const url = req.url || "";

  // POST /api/projects/:id/apply
  if (req.method === "POST" && url.includes("/apply")) {
    try {
      const result = await applyForProject(user.id, id, req.body);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // GET /api/projects/:id/applications
  if (req.method === "GET" && url.includes("/applications")) {
    try {
      const apps = await getProjectApplications(id);
      return res.json({ success: true, applications: apps });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Server error" });
    }
  }

  res.status(404).json({ success: false, error: "Not found" });
}
