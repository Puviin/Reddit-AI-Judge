import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { storageGet, storageGetSignedUrl, storagePut } from "./storage";

const fetchMock = vi.fn();

function okJson(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

describe("storage helpers", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    ENV.forgeApiUrl = "https://forge.example.com/";
    ENV.forgeApiKey = "forge-key";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("storageGet", () => {
    it("maps a key to its proxied storage path", async () => {
      await expect(storageGet("images/cat.png")).resolves.toEqual({
        key: "images/cat.png",
        url: "/manus-storage/images/cat.png",
      });
    });

    it("strips leading slashes from the key", async () => {
      await expect(storageGet("///images/cat.png")).resolves.toEqual({
        key: "images/cat.png",
        url: "/manus-storage/images/cat.png",
      });
    });
  });

  describe("storagePut", () => {
    it("presigns, uploads and returns the hashed key with its proxy url", async () => {
      fetchMock
        .mockResolvedValueOnce(
          okJson({ url: "https://s3.example.com/signed-put" })
        )
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await storagePut("/clips/intro.mp4", "data", "video/mp4");

      expect(result).toEqual({
        key: "clips/intro_aaaaaaaa.mp4",
        url: "/manus-storage/clips/intro_aaaaaaaa.mp4",
      });

      const [presignUrl, presignInit] = fetchMock.mock.calls[0];
      expect(presignUrl.toString()).toBe(
        "https://forge.example.com/v1/storage/presign/put?path=clips%2Fintro_aaaaaaaa.mp4"
      );
      expect(presignInit.headers.Authorization).toBe("Bearer forge-key");

      const [uploadUrl, uploadInit] = fetchMock.mock.calls[1];
      expect(uploadUrl).toBe("https://s3.example.com/signed-put");
      expect(uploadInit.method).toBe("PUT");
      expect(uploadInit.headers["Content-Type"]).toBe("video/mp4");
      expect(await (uploadInit.body as Blob).text()).toBe("data");
    });

    it("appends the hash suffix at the end for extension-less keys", async () => {
      fetchMock
        .mockResolvedValueOnce(
          okJson({ url: "https://s3.example.com/signed-put" })
        )
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await storagePut("clips/intro", Buffer.from("bytes"));

      expect(result.key).toBe("clips/intro_aaaaaaaa");
      expect(fetchMock.mock.calls[1][1].headers["Content-Type"]).toBe(
        "application/octet-stream"
      );
    });

    it("fails when the forge credentials are missing", async () => {
      ENV.forgeApiKey = "";

      await expect(storagePut("a.png", "data")).rejects.toThrow(
        "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("surfaces presign failures with status and body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "denied",
      });

      await expect(storagePut("a.png", "data")).rejects.toThrow(
        "Storage presign failed (403): denied"
      );
    });

    it("rejects an empty presigned url", async () => {
      fetchMock.mockResolvedValueOnce(okJson({}));

      await expect(storagePut("a.png", "data")).rejects.toThrow(
        "Forge returned empty presign URL"
      );
    });

    it("surfaces S3 upload failures", async () => {
      fetchMock
        .mockResolvedValueOnce(
          okJson({ url: "https://s3.example.com/signed-put" })
        )
        .mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(storagePut("a.png", "data")).rejects.toThrow(
        "Storage upload to S3 failed (500)"
      );
    });
  });

  describe("storageGetSignedUrl", () => {
    it("returns the signed url from forge", async () => {
      fetchMock.mockResolvedValueOnce(
        okJson({ url: "https://s3.example.com/signed-get" })
      );

      await expect(storageGetSignedUrl("/clips/intro.mp4")).resolves.toBe(
        "https://s3.example.com/signed-get"
      );
      expect(fetchMock.mock.calls[0][0].toString()).toBe(
        "https://forge.example.com/v1/storage/presign/get?path=clips%2Fintro.mp4"
      );
    });

    it("surfaces signing failures with status and body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "missing",
      });

      await expect(storageGetSignedUrl("clips/intro.mp4")).rejects.toThrow(
        "Storage signed URL failed (404): missing"
      );
    });
  });
});
