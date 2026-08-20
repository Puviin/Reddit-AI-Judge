import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import { registerStorageProxy } from "./storageProxy";

type Handler = (req: Request, res: Response) => Promise<void>;

const fetchMock = vi.fn();

function registerHandler(): Handler {
  let handler: Handler | undefined;
  const app = {
    get: (path: string, fn: Handler) => {
      expect(path).toBe("/manus-storage/*");
      handler = fn;
    },
  } as unknown as Express;

  registerStorageProxy(app);
  if (!handler) throw new Error("handler was not registered");
  return handler;
}

function createResponse() {
  const calls = {
    status: undefined as number | undefined,
    body: undefined as string | undefined,
    headers: {} as Record<string, string>,
    redirect: undefined as { status: number; url: string } | undefined,
  };

  const res = {
    status(code: number) {
      calls.status = code;
      return res;
    },
    send(body: string) {
      calls.body = body;
      return res;
    },
    set(name: string, value: string) {
      calls.headers[name] = value;
      return res;
    },
    redirect(status: number, url: string) {
      calls.redirect = { status, url };
    },
  } as unknown as Response;

  return { res, calls };
}

function createRequest(key?: string) {
  return { params: key === undefined ? {} : { 0: key } } as unknown as Request;
}

describe("registerStorageProxy", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    ENV.forgeApiUrl = "https://forge.example.com//";
    ENV.forgeApiKey = "forge-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("redirects to the signed url and disables caching", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://s3.example.com/signed" }),
    });
    const handler = registerHandler();
    const { res, calls } = createResponse();

    await handler(createRequest("clips/intro.mp4"), res);

    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      "https://forge.example.com/v1/storage/presign/get?path=clips%2Fintro.mp4"
    );
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer forge-key"
    );
    expect(calls.headers["Cache-Control"]).toBe("no-store");
    expect(calls.redirect).toEqual({
      status: 307,
      url: "https://s3.example.com/signed",
    });
  });

  it("rejects requests without a storage key", async () => {
    const handler = registerHandler();
    const { res, calls } = createResponse();

    await handler(createRequest(), res);

    expect(calls.status).toBe(400);
    expect(calls.body).toBe("Missing storage key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a configuration error when forge credentials are missing", async () => {
    ENV.forgeApiKey = "";
    const handler = registerHandler();
    const { res, calls } = createResponse();

    await handler(createRequest("clips/intro.mp4"), res);

    expect(calls.status).toBe(500);
    expect(calls.body).toBe("Storage proxy not configured");
  });

  it("returns 502 when forge responds with an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "denied",
    });
    const handler = registerHandler();
    const { res, calls } = createResponse();

    await handler(createRequest("clips/intro.mp4"), res);

    expect(calls.status).toBe(502);
    expect(calls.body).toBe("Storage backend error");
  });

  it("returns 502 when forge returns an empty signed url", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const handler = registerHandler();
    const { res, calls } = createResponse();

    await handler(createRequest("clips/intro.mp4"), res);

    expect(calls.status).toBe(502);
    expect(calls.body).toBe("Empty signed URL from backend");
  });

  it("returns 502 when the forge request throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const handler = registerHandler();
    const { res, calls } = createResponse();

    await handler(createRequest("clips/intro.mp4"), res);

    expect(calls.status).toBe(502);
    expect(calls.body).toBe("Storage proxy error");
  });
});
