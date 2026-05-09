// DRAMAFORGE SCOUT — Gemini AI Router
// Powers: story analysis, character bibles, courtroom dialogue, verdicts
// Model: gemini-2.0-flash (fast, cost-effective)

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

const GEMINI_MODEL = "gemini-2.0-flash";

async function callGemini(prompt: string, apiKey: string, jsonMode = false): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

export const geminiRouter = router({
  // Analyze a story: drama score, sentiment, key evidence, safety rating
  analyzeStory: publicProcedure
    .input(z.object({
      title: z.string(),
      summary: z.string(),
      comments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

      const prompt = `You are DramaForge Scout, an AI that analyzes internet drama for entertainment value.

Analyze this Reddit/internet drama story and return a JSON object:

STORY TITLE: ${input.title}
STORY SUMMARY: ${input.summary}
${input.comments?.length ? `TOP COMMENTS:\n${input.comments.slice(0, 5).join("\n")}` : ""}

Return ONLY valid JSON with this exact structure:
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

      const raw = await callGemini(prompt, apiKey, true);
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned) as {
        dramaScore: number;
        safetyRating: string;
        sentiment: { plaintiff: number; defendant: number; publicOpinion: number };
        keyEvidence: string[];
        dramaticSummary: string;
        verdictHint: string;
        tags: string[];
        funnyCommentHighlight: string;
      };
    }),

  // Generate character bibles for the story
  generateCharacterBible: publicProcedure
    .input(z.object({
      title: z.string(),
      summary: z.string(),
      plaintiff: z.string(),
      defendant: z.string(),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

      const prompt = `You are DramaForge Scout. Create anime-style character profiles for this internet drama case.

CASE: ${input.title}
SUMMARY: ${input.summary}
PLAINTIFF (person who feels wronged): ${input.plaintiff}
DEFENDANT (person being accused): ${input.defendant}

Return ONLY valid JSON:
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

      const raw = await callGemini(prompt, apiKey, true);
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned) as {
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
      };
    }),

  // Generate courtroom dialogue for the trial
  generateCourtroomDialogue: publicProcedure
    .input(z.object({
      title: z.string(),
      summary: z.string(),
      plaintiff: z.string(),
      defendant: z.string(),
      keyEvidence: z.array(z.string()),
      verdictHint: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

      const prompt = `You are DramaForge Scout. Write a dramatic anime-style courtroom trial for this internet drama.

CASE: ${input.title}
SUMMARY: ${input.summary}
PLAINTIFF: ${input.plaintiff}
DEFENDANT: ${input.defendant}
KEY EVIDENCE: ${input.keyEvidence.join("; ")}

Write exactly 8 courtroom exchanges. Make it dramatic, funny, and anime-inspired with objections, dramatic reveals, and emotional outbursts.

Return ONLY valid JSON:
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

      const raw = await callGemini(prompt, apiKey, true);
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned) as {
        exchanges: Array<{
          id: number;
          speaker: string;
          type: string;
          text: string;
          reaction?: string;
        }>;
      };
    }),

  // Generate the final verdict
  generateVerdict: publicProcedure
    .input(z.object({
      title: z.string(),
      summary: z.string(),
      plaintiff: z.string(),
      defendant: z.string(),
      keyEvidence: z.array(z.string()),
      dramaScore: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

      const prompt = `You are Judge Harrow of the DramaForge Court. Deliver the final verdict for this internet drama case.

CASE: ${input.title}
SUMMARY: ${input.summary}
PLAINTIFF: ${input.plaintiff}
DEFENDANT: ${input.defendant}
KEY EVIDENCE: ${input.keyEvidence.join("; ")}

Return ONLY valid JSON:
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

      const raw = await callGemini(prompt, apiKey, true);
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned) as {
        verdict: string;
        verdictFull: string;
        ruling: string;
        reasoning: string;
        sentencing: string;
        dissent: string;
        dramaRating: string;
        closingStatement: string;
      };
    }),
});
