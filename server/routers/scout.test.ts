import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { scoutRouter } from "./scout";

const searchAndContents = vi.fn();

vi.mock("exa-js", () => ({
  default: class {
    searchAndContents = searchAndContents;
  },
}));

const POST_URL =
  "https://www.reddit.com/r/AmItheAsshole/comments/abc123/my_neighbor_stole_my_fence/";

const fetchMock = vi.fn();

const caller = () =>
  scoutRouter.createCaller({ user: null } as unknown as TrpcContext);

function redditListing(
  post: Record<string, unknown>,
  comments: Array<{ kind?: string; body?: string }>
) {
  return [
    { data: { children: [{ data: post }] } },
    {
      data: {
        children: comments.map(({ kind = "t1", body }) => ({
          kind,
          data: { body },
        })),
      },
    },
  ];
}

function okJson(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
    text: async () => "",
  };
}

function openAiJson(content: Record<string, unknown>) {
  return okJson({
    choices: [{ message: { content: JSON.stringify(content) } }],
  });
}

/** Routes the mocked fetch by host so tests only declare the responses they care about. */
function routeFetch(handlers: {
  reddit?: () => unknown;
  openai?: () => unknown;
}) {
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).includes("reddit.com")) {
      return (
        handlers.reddit?.() ?? {
          ok: false,
          status: 404,
          statusText: "Not Found",
        }
      );
    }
    if (String(url).includes("api.openai.com")) {
      return (
        handlers.openai?.() ?? {
          ok: false,
          status: 500,
          text: async () => "openai down",
        }
      );
    }
    throw new Error(`unexpected fetch to ${url}`);
  });
}

const PARSED = {
  plaintiff: "Fence Owner",
  defendant: "The Neighbor",
  summary: "A fence was moved.",
  conflict: "A very long conflict description.",
  keyEvidence: ["survey map", "text messages"],
  topFunnySafeComments: ["NTA", "The audacity"],
  dramaScore: 90,
  tags: ["Neighbor Drama"],
};

describe("scoutRouter.scoutUrl", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    searchAndContents.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.OPENAI_API_KEY = "sk-test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  it("rejects a non-url input", async () => {
    await expect(caller().scoutUrl({ url: "not-a-url" })).rejects.toThrow();
  });

  describe("Reddit JSON API strategy", () => {
    it("builds the story from the real post and comments", async () => {
      routeFetch({
        reddit: () =>
          okJson(
            redditListing(
              {
                title: "AITA: my neighbor stole my fence",
                selftext: "x".repeat(120),
                subreddit: "AmItheAsshole",
                author: "fenced_in",
                score: 4242,
              },
              [
                { body: "This is a long enough comment" },
                { body: "Another proper comment" },
              ]
            )
          ),
        openai: () => openAiJson(PARSED),
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://www.reddit.com/r/AmItheAsshole/comments/abc123/my_neighbor_stole_my_fence.json?limit=25&raw_json=1"
      );
      expect(story).toMatchObject({
        id: "scouted-1700000000000",
        title: "my neighbor stole my fence",
        source: POST_URL,
        sourceUrl: POST_URL,
        community: "AITA",
        plaintiff: "Fence Owner",
        defendant: "The Neighbor",
        summary: "A fence was moved.",
        conflict: "A very long conflict description.",
        keyEvidence: ["survey map", "text messages"],
        topFunnySafeComments: ["NTA", "The audacity"],
        dramaScore: 90,
        tags: ["Neighbor Drama"],
        recommendationBadge: "HOT CASE",
        isScouted: true,
        fetchedReal: true,
      });
      expect(story.content).toBe("x".repeat(120));
      expect(story.rawComments).toEqual([
        {
          id: "scouted-comment-0",
          text: "NTA",
          platform: "reddit",
          likes: 2600,
          unsafe: false,
        },
        {
          id: "scouted-comment-1",
          text: "The audacity",
          platform: "reddit",
          likes: 2600,
          unsafe: false,
        },
      ]);
      expect(story.adaptionResult).toMatchObject({
        safetyPass: true,
        recommendedForDemo: true,
        keyEvidence: ["survey map", "text messages"],
        topFunnySafeComments: ["NTA", "The audacity"],
      });
    });

    it("skips deleted, removed and too-short comments and caps the list at 15", async () => {
      routeFetch({
        reddit: () =>
          okJson(
            redditListing(
              { title: "Drama", selftext: "y".repeat(60), subreddit: "tifu" },
              [
                { body: "[deleted]" },
                { body: "[removed]" },
                { body: "short" },
                { kind: "more", body: "not a comment but long enough" },
                ...Array.from({ length: 20 }, (_, i) => ({
                  body: `real comment number ${i}`,
                })),
              ]
            )
          ),
        openai: () => openAiJson({ ...PARSED, topFunnySafeComments: [] }),
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      // Falls back to the scraped Reddit comments when the model returns none.
      expect(story.topFunnySafeComments).toEqual([
        "real comment number 0",
        "real comment number 1",
        "real comment number 2",
        "real comment number 3",
        "real comment number 4",
      ]);
      // The community comes from the URL, not the post payload.
      expect(story.community).toBe("AITA");
    });

    it("falls through when the post has no body and no comments", async () => {
      routeFetch({
        reddit: () => okJson(redditListing({ title: "Bare post" }, [])),
        openai: () => openAiJson({ ...PARSED, dramaScore: 80 }),
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.fetchedReal).toBe(false);
      expect(story.title).toBe("my neighbor stole my fence");
      expect(story.recommendationBadge).toBe("SPICY PICK");
    });

    it("ignores a malformed listing payload", async () => {
      routeFetch({
        reddit: () => okJson({ not: "an array" }),
        openai: () => openAiJson(PARSED),
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.fetchedReal).toBe(false);
    });

    it("ignores a listing whose first post has no title", async () => {
      routeFetch({
        reddit: () => okJson(redditListing({}, [])),
        openai: () => openAiJson(PARSED),
      });

      await expect(caller().scoutUrl({ url: POST_URL })).resolves.toBeTruthy();
    });

    it("survives a network failure while fetching Reddit", async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).includes("reddit.com"))
          throw new Error("socket hang up");
        return openAiJson(PARSED);
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.fetchedReal).toBe(false);
    });
  });

  describe("Exa fallback strategy", () => {
    it("splits Exa text into body and comment lines", async () => {
      routeFetch({
        openai: () =>
          openAiJson({
            ...PARSED,
            conflict: "",
            summary: "",
            topFunnySafeComments: [],
          }),
      });
      const bodyLines = Array.from(
        { length: 9 },
        (_, i) => `body line number ${i} of the post`
      );
      const commentLines = Array.from(
        { length: 20 },
        (_, i) => `comment line number ${i} here`
      );
      searchAndContents.mockResolvedValue({
        results: [
          {
            url: "https://reddit.com/comments/abc123/x",
            title: "Real Title",
            text: [...bodyLines, ...commentLines].join("\n"),
          },
        ],
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(searchAndContents).toHaveBeenCalledWith(
        "site:reddit.com my neighbor stole my fence AmItheAsshole",
        expect.objectContaining({
          numResults: 3,
          includeDomains: ["reddit.com", "old.reddit.com"],
        })
      );
      expect(story.fetchedReal).toBe(true);
      expect(story.title).toBe("Real Title");
      expect(story.content.startsWith("body line number 0 of the post")).toBe(
        true
      );
      expect(story.topFunnySafeComments).toHaveLength(5);
      expect(story.topFunnySafeComments[0]).toBe("comment line number 0 here");
    });

    it("drops Exa results that are network security block pages", async () => {
      routeFetch({ openai: () => openAiJson(PARSED) });
      searchAndContents.mockResolvedValue({
        results: [
          {
            url: "https://reddit.com/x",
            title: "Blocked",
            text: `${"z".repeat(200)} blocked by network security`,
          },
        ],
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.fetchedReal).toBe(false);
    });

    it("ignores Exa results that are too short", async () => {
      routeFetch({ openai: () => openAiJson(PARSED) });
      searchAndContents.mockResolvedValue({
        results: [{ url: "https://reddit.com/x", text: "tiny" }],
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.fetchedReal).toBe(false);
    });

    it("survives an Exa search failure", async () => {
      routeFetch({ openai: () => openAiJson(PARSED) });
      searchAndContents.mockRejectedValue(new Error("exa exploded"));

      await expect(caller().scoutUrl({ url: POST_URL })).resolves.toBeTruthy();
    });
  });

  describe("OpenAI parsing failures", () => {
    beforeEach(() => {
      searchAndContents.mockResolvedValue({ results: [] });
    });

    it("falls back to slug-derived evidence and canned comments", async () => {
      routeFetch({});

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.plaintiff).toBe("The Complainant");
      expect(story.defendant).toBe("The Accused");
      expect(story.summary).toBe("my neighbor stole my fence");
      expect(story.dramaScore).toBe(75);
      expect(story.tags).toEqual(["AmItheAsshole"]);
      expect(story.keyEvidence).toEqual(["my neighbor stole my fence"]);
      expect(story.topFunnySafeComments[0]).toBe(
        "This is absolutely unhinged and I love it."
      );
      expect(story.recommendationBadge).toBe("SOLID DRAMA");
    });

    it("falls back when the model returns unparseable content", async () => {
      routeFetch({
        openai: () =>
          okJson({ choices: [{ message: { content: "not json" } }] }),
      });

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.plaintiff).toBe("The Complainant");
    });

    it("falls back when OPENAI_API_KEY is missing", async () => {
      delete process.env.OPENAI_API_KEY;
      routeFetch({});

      const { story } = await caller().scoutUrl({ url: POST_URL });

      expect(story.plaintiff).toBe("The Complainant");
    });
  });

  describe("url parsing", () => {
    it("defaults the subreddit and slug for a non-post url", async () => {
      routeFetch({ openai: () => openAiJson(PARSED) });
      searchAndContents.mockResolvedValue({ results: [] });

      const { story } = await caller().scoutUrl({
        url: "https://example.com/some/page",
      });

      expect(story.community).toBe("reddit");
    });

    it("humanizes an unmapped subreddit name", async () => {
      routeFetch({ openai: () => openAiJson(PARSED) });
      searchAndContents.mockResolvedValue({ results: [] });

      const { story } = await caller().scoutUrl({
        url: "https://www.reddit.com/r/weird_subreddit/comments/abc/some_title/",
      });

      expect(story.community).toBe("weird subreddit");
    });
  });
});
