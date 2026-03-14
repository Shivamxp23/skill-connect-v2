// api/projects/[projectId]/applications/[appId].js — PUT /api/projects/:projectId/applications/:appId
import { ensureSchema, updateProjectApplicationStatus } from "../../../_db.js";
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
    const { appId } = req.query;
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    const result = await updateProjectApplicationStatus(appId, status, user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
