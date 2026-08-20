import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callDataApi } from "./dataApi";
import { ENV } from "./env";

const fetchMock = vi.fn();

function jsonResponse(
  payload: unknown,
  init: { ok?: boolean; status?: number } = {}
) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: "OK",
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

describe("callDataApi", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    ENV.forgeApiUrl = "https://forge.example.com";
    ENV.forgeApiKey = "forge-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires the forge api url", async () => {
    ENV.forgeApiUrl = "";
    await expect(callDataApi("Youtube/search")).rejects.toThrow(
      "BUILT_IN_FORGE_API_URL is not configured"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the forge api key", async () => {
    ENV.forgeApiKey = "";
    await expect(callDataApi("Youtube/search")).rejects.toThrow(
      "BUILT_IN_FORGE_API_KEY is not configured"
    );
  });

  it("posts the api id and options to the forge CallApi endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await callDataApi("Youtube/search", {
      query: { q: "manus" },
      body: { a: 1 },
      pathParams: { id: "7" },
      formData: { file: "x" },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://forge.example.com/webdevtoken.v1.WebDevService/CallApi"
    );
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer forge-key");
    expect(JSON.parse(init.body)).toEqual({
      apiId: "Youtube/search",
      query: { q: "manus" },
      body: { a: 1 },
      path_params: { id: "7" },
      multipart_form_data: { file: "x" },
    });
  });

  it("does not double the slash when the base url already ends with one", async () => {
    ENV.forgeApiUrl = "https://forge.example.com/";
    fetchMock.mockResolvedValue(jsonResponse({}));

    await callDataApi("Youtube/search");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://forge.example.com/webdevtoken.v1.WebDevService/CallApi"
    );
  });

  it("unwraps and parses the jsonData envelope", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ jsonData: JSON.stringify({ items: [1, 2] }) })
    );

    await expect(callDataApi("Youtube/search")).resolves.toEqual({
      items: [1, 2],
    });
  });

  it("returns the raw jsonData string when it is not valid json", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ jsonData: "not-json" }));

    await expect(callDataApi("Youtube/search")).resolves.toBe("not-json");
  });

  it("defaults a missing jsonData value to an empty object", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ jsonData: undefined }));

    await expect(callDataApi("Youtube/search")).resolves.toEqual({});
  });

  it("returns the payload untouched when there is no envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [3] }));

    await expect(callDataApi("Youtube/search")).resolves.toEqual({
      items: [3],
    });
  });

  it("throws with status and detail on a failed request", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "boom",
      json: async () => ({}),
    });

    await expect(callDataApi("Youtube/search")).rejects.toThrow(
      "Data API request failed (500 Internal Server Error): boom"
    );
  });
});
