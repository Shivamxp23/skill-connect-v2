// api/connections.js — GET /api/connections, POST /api/connections/request
import { ensureSchema, getUserConnections, createConnectionRequest } from "./_db.js";
import { requireAuth } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  await ensureSchema();

  // POST /api/connections/request — detect via query param since Vercel routes both here
  if (req.method === "POST") {
    try {
      const { receiverId } = req.body;
      if (!receiverId) return res.status(400).json({ success: false, error: "receiverId required" });
      const result = await createConnectionRequest(user.id, receiverId);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // GET /api/connections
  try {
    const connections = await getUserConnections(user.id);
    res.json({ success: true, connections });
  } catch (err) {
    console.error("Get connections error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
