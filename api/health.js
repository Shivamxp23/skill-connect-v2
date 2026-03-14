// api/health.js
import { ensureSchema } from "./_db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await ensureSchema();
    res.json({ status: "ok", gemini: !!process.env.GEMINI_API_KEY });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
}
