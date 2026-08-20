// DRAMAFORGE SCOUT — AI Analysis Router
// Primary: OpenAI GPT-4o | Fallback: Gemini 2.0 Flash
// Powers: story analysis, character bibles, courtroom dialogue, verdicts

import { z } from "zod";
import { rateLimited, router } from "../_core/trpc";

// Input caps keep untrusted text from inflating third-party token spend.
const SHORT_TEXT = z.string().max(400);
const LONG_TEXT = z.string().max(5000);
const TEXT_LIST = z.array(z.string().max(1000)).max(20);

const aiProcedure = (scope: string) =>
  rateLimited({ scope, limit: 20, windowMs: 60_000 });

// ─── OpenAI helper ───────────────────────────────────────────────────────────
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error(`[AI] OpenAI error ${response.status}: ${err.slice(0, 200)}`);
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty response");
  return text;
}

// ─── Gemini fallback ─────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048, responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error(`[AI] Gemini error ${response.status}: ${err.slice(0, 200)}`);
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

// ─── Unified AI call — OpenAI only (Gemini quota exhausted) ────────────────────
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  return await callOpenAI(systemPrompt, userPrompt);
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const geminiRouter = router({
  analyzeStory: aiProcedure("gemini.analyzeStory")
    .input(z.object({
      title: SHORT_TEXT,
      summary: LONG_TEXT,
      comments: TEXT_LIST.optional(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = "You are DramaForge Scout, an AI that analyzes internet drama for entertainment value. Always respond with valid JSON only.";
      const userPrompt = `Analyze this Reddit/internet drama story and return a JSON object.

STORY TITLE: ${input.title}
STORY SUMMARY: ${input.summary}
${input.comments?.length ? `TOP COMMENTS:\n${input.comments.slice(0, 5).join("\n")}` : ""}

Return JSON with this exact structure:
{
  "dramaScore": <number 1-100, how dramatic/entertaining>,
  "safetyRating": <"WHOLESOME" | "MILD" | "SPICY" | "NUCLEAR">,
  "sentiment": {
    "plaintiff": <number -100 to 100, negative=unsympathetic, positive=sympathetic>,
    "defendant": <number -100 to 100>,
    "publicOpinion": <number -100 to 100, overall public sympathy>
  },
  "keyEvidence": [<array of 3-5 key facts/quotes from the story as strings>],
  "dramaticSummary": <one punchy sentence describing the drama>,
  "verdictHint": <"NTA" | "YTA" | "ESH" | "NAH" | "INFO">,
  "tags": [<array of 3-5 drama tags like "family drama", "betrayal", "money issues">],
  "funnyCommentHighlight": <pick the funniest/most insightful comment or write one if none provided>
}`;

      const raw = await callAI(systemPrompt, userPrompt);
      return parseJSON<{
        dramaScore: number;
        safetyRating: string;
        sentiment: { plaintiff: number; defendant: number; publicOpinion: number };
        keyEvidence: string[];
        dramaticSummary: string;
        verdictHint: string;
        tags: string[];
        funnyCommentHighlight: string;
      }>(raw);
    }),

  generateCharacterBible: aiProcedure("gemini.generateCharacterBible")
    .input(z.object({
      title: SHORT_TEXT,
      summary: LONG_TEXT,
      plaintiff: SHORT_TEXT,
      defendant: SHORT_TEXT,
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = "You are DramaForge Scout. Create anime-style character profiles for internet drama cases. Always respond with valid JSON only.";
      const userPrompt = `Create anime-style character profiles for this internet drama case.

CASE: ${input.title}
SUMMARY: ${input.summary}
PLAINTIFF (person who feels wronged): ${input.plaintiff}
DEFENDANT (person being accused): ${input.defendant}

Return JSON:
{
  "characters": [
    {
      "id": "plaintiff",
      "name": <short first name or nickname>,
      "role": "Plaintiff",
      "archetype": <anime archetype like "The Righteous Crusader", "The Wounded Heart">,
      "personality": <2-3 word personality description>,
      "motivation": <what they want from this trial, 1 sentence>,
      "weakness": <their blind spot or flaw, 1 sentence>,
      "catchphrase": <their dramatic courtroom catchphrase>,
      "animeStyle": <their anime character style, e.g. "tsundere", "kuudere", "shonen hero">
    },
    {
      "id": "defendant",
      "name": <short first name or nickname>,
      "role": "Defendant",
      "archetype": <anime archetype>,
      "personality": <2-3 word personality description>,
      "motivation": <what they want from this trial, 1 sentence>,
      "weakness": <their blind spot or flaw, 1 sentence>,
      "catchphrase": <their dramatic courtroom catchphrase>,
      "animeStyle": <their anime character style>
    },
    {
      "id": "judge",
      "name": "Judge Harrow",
      "role": "Judge",
      "archetype": "The Impartial Arbiter",
      "personality": "stern, wise, dramatic",
      "motivation": "To deliver justice with maximum theatrical flair",
      "weakness": "Secretly enjoys the drama a little too much",
      "catchphrase": "ORDER! This court will have ORDER!",
      "animeStyle": "the wise mentor type"
    },
    {
      "id": "witness",
      "name": <a witness name relevant to the story>,
      "role": "Key Witness",
      "archetype": <fitting archetype>,
      "personality": <2-3 words>,
      "motivation": <1 sentence>,
      "weakness": <1 sentence>,
      "catchphrase": <their dramatic line>,
      "animeStyle": <anime style>
    }
  ]
}`;

      const raw = await callAI(systemPrompt, userPrompt);
      return parseJSON<{
        characters: Array<{
          id: string;
          name: string;
          role: string;
          archetype: string;
          personality: string;
          motivation: string;
          weakness: string;
          catchphrase: string;
          animeStyle: string;
        }>;
      }>(raw);
    }),

  generateCourtroomDialogue: aiProcedure("gemini.generateCourtroomDialogue")
    .input(z.object({
      title: SHORT_TEXT,
      summary: LONG_TEXT,
      plaintiff: SHORT_TEXT,
      defendant: SHORT_TEXT,
      keyEvidence: TEXT_LIST,
      verdictHint: SHORT_TEXT.optional(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = "You are DramaForge Scout. Write dramatic anime-style courtroom trials for internet drama cases. Always respond with valid JSON only.";
      const userPrompt = `Write a dramatic anime-style courtroom trial for this internet drama.

CASE: ${input.title}
SUMMARY: ${input.summary}
PLAINTIFF: ${input.plaintiff}
DEFENDANT: ${input.defendant}
KEY EVIDENCE: ${input.keyEvidence.join("; ")}

Write exactly 8 courtroom exchanges. Make it dramatic, funny, and anime-inspired with objections, dramatic reveals, and emotional outbursts.

Return JSON:
{
  "exchanges": [
    {
      "id": <1-8>,
      "speaker": <"Judge" | "Plaintiff" | "Defendant" | "Witness" | "Narrator">,
      "type": <"statement" | "objection" | "evidence" | "breakdown" | "revelation" | "verdict">,
      "text": <the dramatic dialogue line, 1-3 sentences>,
      "reaction": <optional: how the courtroom reacts, e.g. "GASPS from the gallery!">
    }
  ]
}`;

      const raw = await callAI(systemPrompt, userPrompt);
      return parseJSON<{
        exchanges: Array<{
          id: number;
          speaker: string;
          type: string;
          text: string;
          reaction?: string;
        }>;
      }>(raw);
    }),

  generateVerdict: aiProcedure("gemini.generateVerdict")
    .input(z.object({
      title: SHORT_TEXT,
      summary: LONG_TEXT,
      plaintiff: SHORT_TEXT,
      defendant: SHORT_TEXT,
      keyEvidence: TEXT_LIST,
      dramaScore: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = "You are Judge Harrow of the DramaForge Court. Deliver dramatic verdicts for internet drama cases. Always respond with valid JSON only.";
      const userPrompt = `Deliver the final verdict for this internet drama case.

CASE: ${input.title}
SUMMARY: ${input.summary}
PLAINTIFF: ${input.plaintiff}
DEFENDANT: ${input.defendant}
KEY EVIDENCE: ${input.keyEvidence.join("; ")}
${input.dramaScore ? `DRAMA SCORE: ${input.dramaScore}/100` : ""}

Return JSON:
{
  "verdict": <"NTA" | "YTA" | "ESH" | "NAH">,
  "verdictFull": <full verdict name, e.g. "NOT THE ASSHOLE">,
  "ruling": <Judge Harrow's dramatic 2-3 sentence ruling>,
  "reasoning": <3-4 sentences of legal/moral reasoning in anime judge style>,
  "sentencing": <funny/dramatic "sentence" like "Must apologize via skywriting" or "Banned from birthday dinners for 1 year">,
  "dissent": <1 sentence of the minority opinion, if any>,
  "dramaRating": <"⭐" | "⭐⭐" | "⭐⭐⭐" | "⭐⭐⭐⭐" | "⭐⭐⭐⭐⭐">,
  "closingStatement": <Judge Harrow's final dramatic line to close the case>
}`;

      const raw = await callAI(systemPrompt, userPrompt);
      return parseJSON<{
        verdict: string;
        verdictFull: string;
        ruling: string;
        reasoning: string;
        sentencing: string;
        dissent: string;
        dramaRating: string;
        closingStatement: string;
      }>(raw);
    }),
});
