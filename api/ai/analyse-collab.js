// api/ai/analyse-collab.js — POST /ai/analyse-collab
import { GoogleGenerativeAI } from "@google/generative-ai";

function extractLine(text, key) {
  const match = text.match(new RegExp(`${key}:\\s*(.*)`, "i"));
  return match ? match[1].trim() : "";
}
function extractNumber(text, key) {
  const line = extractLine(text, key);
  const num = parseInt(line);
  return isNaN(num) ? null : num;
}
function extractList(text, key) {
  const splitIndex = text.toUpperCase().indexOf(key.toUpperCase() + ":");
  if (splitIndex === -1) return [];
  const rest = text.slice(splitIndex + key.length + 1);
  const stop = rest.search(/\n[A-Z\s]{3,30}:/);
  const section = stop === -1 ? rest : rest.slice(0, stop);
  return section.split(/\r?\n/).map(l => l.replace(/^[\-\•\*\s]+/, "").trim()).filter(l => l.length > 0);
}
function extractSection(text, key) {
  const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]{3,20}:|$)`, "i");
  const match = text.match(regex);
  if (!match) return "";
  return match[1].trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { applicantGithub = "Not provided", requiredSkills = [], applicantName = "Applicant" } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      const mockScore = 78;
      return res.json({
        matchScore: mockScore,
        strengths: ["Clear repo structure", "Good README", "Relevant libraries used"],
        weaknesses: ["Missing tests", "Sparse documentation in some modules"],
        repoQuality: "Good",
        recommendation: mockScore >= 70 ? "Suitable" : "May not be suitable",
        details: `This is a MOCK analysis because GEMINI_API_KEY is not set. Applicant: ${applicantName}, Repo: ${applicantGithub}`
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an AI evaluating a contributor for a software project.
You MUST give a VERY SHORT response. Do NOT add long explanations.

Applicant:
Name: ${applicantName}
GitHub: ${applicantGithub}
Required Skills: ${requiredSkills.join(", ")}

RETURN THE ANSWER ONLY IN THIS EXACT FORMAT.  
ABSOLUTELY NO EXTRA TEXT, NO EXTRA SECTIONS:

MATCH SCORE: <number only>

STRENGTHS:
- <max 2 bullets>

WEAKNESSES:
- <max 2 bullets>

REPO QUALITY: <one-word rating: Excellent, Good, Average, Poor>

RECOMMENDATION: <Suitable / Borderline / Not Suitable>

DETAILS: <ONE sentence ONLY. No more.>

CONCLUSION: <2-3 sentence on what decision should user make.>

RULES:
- DO NOT add improvement lists.
- DO NOT add analysis paragraphs.
- DO NOT add introductions or conclusions.
- DO NOT output more than what is required.
- Keep everything as short as possible.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const response = {
      matchScore: extractNumber(text, "MATCH SCORE") || null,
      strengths: extractList(text, "STRENGTHS"),
      weaknesses: extractList(text, "WEAKNESSES"),
      repoQuality: extractLine(text, "REPO QUALITY"),
      recommendation: extractLine(text, "RECOMMENDATION"),
      details: extractSection(text, "DETAILS"),
      conclusion: extractSection(text, "CONCLUSION"),
    };

    if (response.details && response.details.includes("CONCLUSION:")) {
      const parts = response.details.split(/CONCLUSION:/i);
      response.details = parts[0].trim();
      response.conclusion = parts[1].trim();
    }

    res.json(response);
  } catch (err) {
    console.error("AI Analyse Error:", err);
    res.status(500).json({ error: "AI analysis failed" });
  }
}
