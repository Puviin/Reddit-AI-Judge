import { describe, it, expect } from "vitest";
import "dotenv/config";

describe("Sponsor API keys", () => {
  it("FAL_API_KEY is configured", () => {
    expect(process.env.FAL_API_KEY).toBeTruthy();
    expect(process.env.FAL_API_KEY?.length).toBeGreaterThan(10);
  });

  it("ELEVENLABS_API_KEY is configured", () => {
    expect(process.env.ELEVENLABS_API_KEY).toBeTruthy();
    expect(process.env.ELEVENLABS_API_KEY?.length).toBeGreaterThan(10);
  });
});
