// api/connections/[id].js — PUT /api/connections/:id
import { ensureSchema, updateConnectionStatus } from "../_db.js";
import { requireAuth } from "../_auth.js";

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
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    const result = await updateConnectionStatus(id, status);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
}
