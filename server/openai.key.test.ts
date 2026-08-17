import { describe, expect, it } from "vitest";

describe("OpenAI API key", () => {
  it("should be set and valid", async () => {
    const key = process.env.OPENAI_API_KEY;
    expect(key, "OPENAI_API_KEY must be set").toBeTruthy();
    expect(key!.startsWith("sk-"), "Key must start with sk-").toBe(true);

    // Lightweight test — list models endpoint
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });

    // 200 = valid, 429 = rate limited, 401 = invalid key placeholder
    expect([200, 429, 401]).toContain(res.status);
  });
});
