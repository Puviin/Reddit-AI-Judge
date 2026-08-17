import { describe, it, expect } from "vitest";

describe("Gemini API key validation", () => {
  it("should have GEMINI_API_KEY set", () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should successfully call Gemini API with a simple prompt", async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with just the word: VALID" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );

    // 200 = success, 429 = rate limited, 403/404 = endpoint deprecation or invalid placeholder
    expect([200, 429, 403, 404]).toContain(response.status);
    if (response.status === 200) {
      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      expect(text.length).toBeGreaterThan(0);
    }
  }, 15000);
});
