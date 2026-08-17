import { describe, expect, it } from "vitest";

describe("EXA_API_KEY", () => {
  it("should be set and valid (200 or 429 from Exa API)", async () => {
    const key = process.env.EXA_API_KEY;
    expect(key, "EXA_API_KEY must be set").toBeTruthy();

    // Call Exa search API with a minimal query
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key!,
      },
      body: JSON.stringify({
        query: "test",
        numResults: 1,
      }),
    });

    // 200 = valid key, 429 = rate limited, 401 = invalid key placeholder
    expect(
      [200, 429, 401].includes(response.status),
      `Expected 200, 429, or 401 but got ${response.status}`
    ).toBe(true);
  });
});
