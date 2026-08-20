import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./env";
import { generateImage } from "./imageGeneration";

const storagePut = vi.fn();

vi.mock("server/storage", () => ({
  storagePut: (...args: unknown[]) => storagePut(...args),
}));

const fetchMock = vi.fn();

function imageResponse(b64Json: string, mimeType = "image/png") {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ image: { b64Json, mimeType } }),
    text: async () => "",
  };
}

describe("generateImage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storagePut.mockReset();
    storagePut.mockResolvedValue({
      key: "generated/1.png",
      url: "/manus-storage/generated/1.png",
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    ENV.forgeApiUrl = "https://forge.example.com";
    ENV.forgeApiKey = "forge-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls the image service and stores the decoded image", async () => {
    fetchMock.mockResolvedValue(
      imageResponse(Buffer.from("png-bytes").toString("base64"))
    );

    const result = await generateImage({ prompt: "a courtroom" });

    expect(result).toEqual({ url: "/manus-storage/generated/1.png" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://forge.example.com/images.v1.ImageService/GenerateImage"
    );
    expect(init.headers.authorization).toBe("Bearer forge-key");
    expect(JSON.parse(init.body)).toEqual({
      prompt: "a courtroom",
      original_images: [],
    });
    expect(storagePut).toHaveBeenCalledWith(
      "generated/1700000000000.png",
      Buffer.from("png-bytes"),
      "image/png"
    );
  });

  it("forwards original images for edits and honours a trailing slash base url", async () => {
    ENV.forgeApiUrl = "https://forge.example.com/";
    fetchMock.mockResolvedValue(
      imageResponse(Buffer.from("x").toString("base64"), "image/jpeg")
    );
    const originalImages = [
      { url: "https://example.com/a.jpg", mimeType: "image/jpeg" },
    ];

    await generateImage({ prompt: "add a rainbow", originalImages });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://forge.example.com/images.v1.ImageService/GenerateImage"
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).original_images).toEqual(
      originalImages
    );
    expect(storagePut.mock.calls[0][2]).toBe("image/jpeg");
  });

  it("requires the forge api url", async () => {
    ENV.forgeApiUrl = "";

    await expect(generateImage({ prompt: "x" })).rejects.toThrow(
      "BUILT_IN_FORGE_API_URL is not configured"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the forge api key", async () => {
    ENV.forgeApiKey = "";

    await expect(generateImage({ prompt: "x" })).rejects.toThrow(
      "BUILT_IN_FORGE_API_KEY is not configured"
    );
  });

  it("surfaces the failure status and detail", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "bad prompt",
    });

    await expect(generateImage({ prompt: "x" })).rejects.toThrow(
      "Image generation request failed (400 Bad Request): bad prompt"
    );
  });
});
