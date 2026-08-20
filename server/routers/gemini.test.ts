import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { geminiRouter } from "./gemini";

const fetchMock = vi.fn();

const caller = () =>
  geminiRouter.createCaller({ user: null } as unknown as TrpcContext);

function openAiContent(content: string) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  };
}

function requestBody() {
  return JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
}

function userPrompt() {
  return requestBody().messages[1].content as string;
}

const STORY = {
  title: "Fence Wars",
  summary: "A fence was moved by a neighbor.",
};

const CASE = {
  ...STORY,
  plaintiff: "Fence Owner",
  defendant: "The Neighbor",
  keyEvidence: ["survey map", "text messages"],
};

describe("geminiRouter", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.OPENAI_API_KEY = "sk-test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  describe("analyzeStory", () => {
    it("returns the parsed analysis and sends a gpt-4o json request", async () => {
      fetchMock.mockResolvedValue(
        openAiContent(JSON.stringify({ dramaScore: 88, tags: ["fence"] }))
      );

      const result = await caller().analyzeStory(STORY);

      expect(result).toEqual({ dramaScore: 88, tags: ["fence"] });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(init.headers.Authorization).toBe("Bearer sk-test");
      expect(requestBody()).toMatchObject({
        model: "gpt-4o",
        response_format: { type: "json_object" },
      });
      expect(userPrompt()).toContain("Fence Wars");
      expect(userPrompt()).not.toContain("TOP COMMENTS");
    });

    it("includes at most five comments in the prompt", async () => {
      fetchMock.mockResolvedValue(openAiContent("{}"));

      await caller().analyzeStory({
        ...STORY,
        comments: ["c1", "c2", "c3", "c4", "c5", "c6"],
      });

      expect(userPrompt()).toContain("TOP COMMENTS:\nc1\nc2\nc3\nc4\nc5");
      expect(userPrompt()).not.toContain("c6");
    });

    it("strips markdown code fences before parsing", async () => {
      fetchMock.mockResolvedValue(
        openAiContent('```json\n{"dramaScore": 42}\n```')
      );

      await expect(caller().analyzeStory(STORY)).resolves.toEqual({
        dramaScore: 42,
      });
    });

    it("fails when OPENAI_API_KEY is missing", async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(caller().analyzeStory(STORY)).rejects.toThrow(
        "OPENAI_API_KEY not set"
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("surfaces an OpenAI http error with a truncated body", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "e".repeat(300),
      });

      await expect(caller().analyzeStory(STORY)).rejects.toThrow(
        `OpenAI error 500: ${"e".repeat(200)}`
      );
    });

    it("fails on an empty completion", async () => {
      fetchMock.mockResolvedValue(openAiContent(""));

      await expect(caller().analyzeStory(STORY)).rejects.toThrow(
        "OpenAI returned empty response"
      );
    });

    it("rejects input that is missing required fields", async () => {
      await expect(
        caller().analyzeStory({ title: "only a title" } as never)
      ).rejects.toThrow();
    });
  });

  describe("generateCharacterBible", () => {
    it("prompts with both parties and returns the characters", async () => {
      fetchMock.mockResolvedValue(
        openAiContent(JSON.stringify({ characters: [{ id: "judge" }] }))
      );

      const result = await caller().generateCharacterBible({
        title: CASE.title,
        summary: CASE.summary,
        plaintiff: CASE.plaintiff,
        defendant: CASE.defendant,
      });

      expect(result).toEqual({ characters: [{ id: "judge" }] });
      expect(userPrompt()).toContain(
        "PLAINTIFF (person who feels wronged): Fence Owner"
      );
      expect(userPrompt()).toContain(
        "DEFENDANT (person being accused): The Neighbor"
      );
    });
  });

  describe("generateCourtroomDialogue", () => {
    it("joins the evidence into the prompt and returns the exchanges", async () => {
      fetchMock.mockResolvedValue(
        openAiContent(JSON.stringify({ exchanges: [{ id: 1 }] }))
      );

      const result = await caller().generateCourtroomDialogue(CASE);

      expect(result).toEqual({ exchanges: [{ id: 1 }] });
      expect(userPrompt()).toContain("KEY EVIDENCE: survey map; text messages");
    });
  });

  describe("generateVerdict", () => {
    it("omits the drama score line when it is not provided", async () => {
      fetchMock.mockResolvedValue(
        openAiContent(JSON.stringify({ verdict: "NTA" }))
      );

      const result = await caller().generateVerdict(CASE);

      expect(result).toEqual({ verdict: "NTA" });
      expect(userPrompt()).not.toContain("DRAMA SCORE");
    });

    it("includes the drama score line when provided", async () => {
      fetchMock.mockResolvedValue(openAiContent("{}"));

      await caller().generateVerdict({ ...CASE, dramaScore: 91 });

      expect(userPrompt()).toContain("DRAMA SCORE: 91/100");
    });
  });
});
