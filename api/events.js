// api/events.js — GET + POST /api/events
import { ensureSchema, getEvents, createEvent } from "./_db.js";
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
      const events = await getEvents(user.id);
      return res.json({ success: true, events });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { title, description, start_time, end_time, location, club_id } = req.body;
      if (!title || !start_time || !end_time) {
        return res.status(400).json({ success: false, error: "title, start_time, end_time required" });
      }
      const result = await createEvent(user.id, { title, description, start_time, end_time, location, club_id });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  res.status(405).json({ success: false, error: "Method not allowed" });
}
