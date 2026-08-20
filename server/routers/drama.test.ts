import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { dramaRouter } from "./drama";

const falRun = vi.fn();
const falConfig = vi.fn();
const storagePut = vi.fn();
const getDb = vi.fn();
const fetchMock = vi.fn();

vi.mock("@fal-ai/client", () => ({
  fal: {
    config: (...args: unknown[]) => falConfig(...args),
    run: (...args: unknown[]) => falRun(...args),
  },
}));

vi.mock("../storage", () => ({
  storagePut: (...args: unknown[]) => storagePut(...args),
}));

vi.mock("../db", () => ({
  getDb: () => getDb(),
}));

const caller = () =>
  dramaRouter.createCaller({ user: null } as unknown as TrpcContext);

const SCENE = {
  id: "intro",
  title: "The Opening",
  prompt: "raw prompt",
  narration: "The court is now in session.",
  speakerRole: "Judge",
};

const JOB_INPUT = {
  storyId: "story-1",
  storyTitle: "Fence Wars",
  storyContext: {
    summary: "A fence moved.",
    plaintiff: "Owner",
    defendant: "Neighbor",
  },
  themeId: "netflix-crime",
  scenes: [SCENE],
};

/** Lets the fire-and-forget reel job progress until it reports done. */
async function waitForJob(jobId: string) {
  for (let i = 0; i < 200; i++) {
    const progress = await caller().getJobProgress({ jobId });
    if (progress?.status === "done") return progress;
    await new Promise(resolve => setImmediate(resolve));
  }
  throw new Error("reel job did not finish");
}

function selectResult(rows: unknown[]) {
  return { from: () => ({ where: () => ({ limit: async () => rows }) }) };
}

function createDb(rowsByKey: Record<string, unknown[]>) {
  const onDuplicateKeyUpdate = vi.fn(async () => undefined);
  const values = vi.fn(() => ({ onDuplicateKeyUpdate }));
  let selectCall = 0;
  const keys = Object.keys(rowsByKey);
  return {
    db: {
      select: () => selectResult(rowsByKey[keys[selectCall++]] ?? []),
      insert: () => ({ values }),
    },
    values,
    onDuplicateKeyUpdate,
  };
}

function audioResponse() {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => Buffer.from("mp3").buffer,
  };
}

describe("dramaRouter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    falRun.mockReset();
    falConfig.mockReset();
    storagePut.mockReset();
    getDb.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    getDb.mockResolvedValue(null);
    storagePut.mockImplementation(async (key: string) => ({
      key,
      url: `/manus-storage/${key}`,
    }));
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("api.elevenlabs.io")) return audioResponse();
      if (String(url).includes("api.openai.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: " a cinematic prompt " } }],
          }),
          text: async () => "",
        };
      }
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => Buffer.from("media").buffer,
      };
    });
    process.env.FAL_API_KEY = "fal-key";
    process.env.ELEVENLABS_API_KEY = "eleven-key";
    process.env.OPENAI_API_KEY = "sk-test";
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.FAL_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe("startReelJob", () => {
    it("generates video plus narration and caches the reel", async () => {
      const { db, values, onDuplicateKeyUpdate } = createDb({});
      getDb.mockResolvedValue(db);
      falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });

      const { jobId, total } = await caller().startReelJob(JOB_INPUT);
      expect(total).toBe(1);

      const progress = await waitForJob(jobId);

      expect(falConfig).toHaveBeenCalledWith({ credentials: "fal-key" });
      expect(falRun).toHaveBeenCalledWith(
        "fal-ai/ltx-2.3/text-to-video/fast",
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: "a cinematic prompt",
            resolution: "1080p",
          }),
        })
      );
      expect(progress).toMatchObject({
        status: "done",
        total: 1,
        completed: 1,
        percent: 100,
        scenes: [
          {
            id: "intro",
            status: "done",
            mediaType: "video",
            videoUrl: "/manus-storage/drama-scenes/story-1/intro.mp4",
            audioUrl: "/manus-storage/drama-audio/story-1/intro.mp3",
          },
        ],
      });
      // Judge narration uses the Judge voice id.
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("JBFqnCBsd6RMkjVDRZzb")
        )
      ).toBe(true);
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: "story-1::netflix-crime",
          sceneCount: 1,
        })
      );
      expect(onDuplicateKeyUpdate).toHaveBeenCalled();
    });

    it("falls back to a still image when video generation fails", async () => {
      falRun
        .mockRejectedValueOnce(new Error("ltx unavailable"))
        .mockResolvedValueOnce({
          images: [{ url: "https://fal.media/frame" }],
        });

      const { jobId } = await caller().startReelJob(JOB_INPUT);
      const progress = await waitForJob(jobId);

      expect(falRun.mock.calls[1][0]).toBe("fal-ai/flux/schnell");
      expect(progress?.scenes[0]).toMatchObject({
        mediaType: "image",
        videoUrl: "/manus-storage/drama-scenes/story-1/intro.jpg",
      });
    });

    it("marks the scene as errored when both fal models fail", async () => {
      falRun.mockRejectedValue(new Error("fal down"));

      const { jobId } = await caller().startReelJob(JOB_INPUT);
      const progress = await waitForJob(jobId);

      expect(progress?.scenes[0]).toMatchObject({
        status: "done",
        videoUrl: null,
        mediaType: "image",
      });
    });

    it("keeps the remote media url when re-uploading it fails", async () => {
      falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });
      storagePut.mockImplementation(async (key: string) => {
        if (key.startsWith("drama-scenes/")) throw new Error("s3 down");
        return { key, url: `/manus-storage/${key}` };
      });

      const { jobId } = await caller().startReelJob(JOB_INPUT);
      const progress = await waitForJob(jobId);

      expect(progress?.scenes[0].videoUrl).toBe("https://fal.media/scene");
    });

    it("skips both media steps when the sponsor keys are missing", async () => {
      delete process.env.FAL_API_KEY;
      delete process.env.ELEVENLABS_API_KEY;

      const { jobId } = await caller().startReelJob(JOB_INPUT);
      const progress = await waitForJob(jobId);

      expect(falRun).not.toHaveBeenCalled();
      expect(progress?.scenes[0]).toMatchObject({
        videoUrl: null,
        audioUrl: null,
      });
    });

    it("marks audio as missing when ElevenLabs rejects the request", async () => {
      falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).includes("api.elevenlabs.io")) {
          return { ok: false, status: 401, text: async () => "bad key" };
        }
        if (String(url).includes("api.openai.com")) {
          return {
            ok: true,
            json: async () => ({ choices: [] }),
            text: async () => "",
          };
        }
        return {
          ok: true,
          arrayBuffer: async () => Buffer.from("media").buffer,
        };
      });

      const { jobId } = await caller().startReelJob(JOB_INPUT);
      const progress = await waitForJob(jobId);

      expect(progress?.scenes[0].audioUrl).toBeNull();
    });

    it("survives a failure while caching the reel", async () => {
      getDb.mockRejectedValue(new Error("db unreachable"));
      falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });

      const { jobId } = await caller().startReelJob(JOB_INPUT);

      await expect(waitForJob(jobId)).resolves.toMatchObject({
        status: "done",
      });
    });

    describe("scene prompt generation", () => {
      it("uses a theme-styled fallback prompt when OpenAI is unavailable", async () => {
        delete process.env.OPENAI_API_KEY;
        falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });

        const { jobId } = await caller().startReelJob(JOB_INPUT);
        await waitForJob(jobId);

        const prompt = falRun.mock.calls[0][1].input.prompt as string;
        expect(prompt).toContain(SCENE.narration);
        expect(prompt).toContain("Netflix true crime documentary style");
      });

      it("falls back when OpenAI returns an http error", async () => {
        falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });
        fetchMock.mockImplementation(async (url: string) => {
          if (String(url).includes("api.openai.com")) {
            return { ok: false, status: 429, text: async () => "rate limited" };
          }
          if (String(url).includes("api.elevenlabs.io")) return audioResponse();
          return {
            ok: true,
            arrayBuffer: async () => Buffer.from("media").buffer,
          };
        });

        const { jobId } = await caller().startReelJob(JOB_INPUT);
        await waitForJob(jobId);

        expect(falRun.mock.calls[0][1].input.prompt).toContain(SCENE.narration);
      });

      it("defaults to the anime-battle style for an unknown theme", async () => {
        delete process.env.OPENAI_API_KEY;
        falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });

        const { jobId } = await caller().startReelJob({
          ...JOB_INPUT,
          themeId: "does-not-exist",
        });
        await waitForJob(jobId);

        expect(falRun.mock.calls[0][1].input.prompt).toContain(
          "anime art style"
        );
      });

      it("sends the theme and story context to OpenAI", async () => {
        falRun.mockResolvedValue({ video: { url: "https://fal.media/scene" } });

        const { jobId } = await caller().startReelJob(JOB_INPUT);
        await waitForJob(jobId);

        const openAiCall = fetchMock.mock.calls.find(([url]) =>
          String(url).includes("api.openai.com")
        )!;
        const userPrompt = JSON.parse(openAiCall[1].body).messages[1]
          .content as string;
        expect(userPrompt).toContain("STORY: Fence Wars");
        expect(userPrompt).toContain("SPEAKER: Judge");
        expect(userPrompt).toContain("handheld documentary camera");
      });
    });
  });

  describe("getJobProgress", () => {
    it("returns null for an unknown job", async () => {
      await expect(
        caller().getJobProgress({ jobId: "missing" })
      ).resolves.toBeNull();
    });
  });

  describe("getReelCache", () => {
    const row = {
      storyId: "story-1::netflix-crime",
      storyTitle: "Fence Wars",
      sceneCount: 2,
      scenes: [{ id: "intro" }],
      createdAt: new Date("2025-01-01"),
    };

    it("returns null when no database is configured", async () => {
      await expect(
        caller().getReelCache({ storyId: "story-1" })
      ).resolves.toBeNull();
    });

    it("returns the theme specific cache entry", async () => {
      getDb.mockResolvedValue(createDb({ themed: [row] }).db);

      await expect(
        caller().getReelCache({ storyId: "story-1", themeId: "netflix-crime" })
      ).resolves.toMatchObject({
        storyId: "story-1::netflix-crime",
        sceneCount: 2,
      });
    });

    it("falls back to the legacy storyId-only cache entry", async () => {
      getDb.mockResolvedValue(
        createDb({ themed: [], legacy: [{ ...row, storyId: "story-1" }] }).db
      );

      await expect(
        caller().getReelCache({ storyId: "story-1", themeId: "netflix-crime" })
      ).resolves.toMatchObject({ storyId: "story-1" });
    });

    it("returns null when neither cache key matches", async () => {
      getDb.mockResolvedValue(createDb({ themed: [], legacy: [] }).db);

      await expect(
        caller().getReelCache({ storyId: "story-1", themeId: "netflix-crime" })
      ).resolves.toBeNull();
    });

    it("returns null when no rows match without a theme", async () => {
      getDb.mockResolvedValue(createDb({ only: [] }).db);

      await expect(
        caller().getReelCache({ storyId: "story-1" })
      ).resolves.toBeNull();
    });

    it("returns null when the query throws", async () => {
      getDb.mockResolvedValue({
        select: () => {
          throw new Error("query failed");
        },
      });

      await expect(
        caller().getReelCache({ storyId: "story-1" })
      ).resolves.toBeNull();
    });
  });
});
