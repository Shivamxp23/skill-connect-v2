// api/ai/skills.js — POST /ai/skills
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { skills } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        suggestions: `Mock suggestions because GEMINI_API_KEY is not set. Provided skills: ${skills.map(s => s.name + "(" + s.level + ")").join(", ")}`
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = `
You are an AI career mentor. Using the user's skill levels, suggest what they should learn next.
Keep the output in 5–8 simple bullet points.

User Skills:
${skills.map(s => `• ${s.name} (${s.level})`).join("\n")}
`;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.4 } });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ success: true, suggestions: text });
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ success: false, error: "AI backend error" });
  }
}
