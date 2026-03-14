// api/_auth.js — JWT middleware helper for Vercel serverless functions
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here";

export function getTokenPayload(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const user = getTokenPayload(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Access denied" });
    return null;
  }
  return user;
}

export { JWT_SECRET };
