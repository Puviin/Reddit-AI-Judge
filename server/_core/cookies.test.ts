import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./cookies";

function createRequest(
  protocol: string,
  headers: Request["headers"] = {} as Request["headers"]
): Request {
  return { protocol, headers } as Request;
}

describe("getSessionCookieOptions", () => {
  it("always returns httpOnly, root path and cross-site cookies", () => {
    const options = getSessionCookieOptions(createRequest("http"));

    expect(options).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: false,
    });
  });

  it("marks the cookie secure for direct https requests", () => {
    expect(getSessionCookieOptions(createRequest("https")).secure).toBe(true);
  });

  it("trusts the x-forwarded-proto header when the request is proxied", () => {
    const forwarded = getSessionCookieOptions(
      createRequest("http", {
        "x-forwarded-proto": "https",
      } as Request["headers"])
    );
    expect(forwarded.secure).toBe(true);
  });

  it("accepts https anywhere in a comma separated forwarded proto chain", () => {
    const forwarded = getSessionCookieOptions(
      createRequest("http", {
        "x-forwarded-proto": "http, HTTPS ",
      } as Request["headers"])
    );
    expect(forwarded.secure).toBe(true);
  });

  it("accepts https from a repeated forwarded proto header", () => {
    const forwarded = getSessionCookieOptions(
      createRequest("http", {
        "x-forwarded-proto": ["http", "https"],
      } as unknown as Request["headers"])
    );
    expect(forwarded.secure).toBe(true);
  });

  it("stays insecure when the forwarded proto is plain http", () => {
    const forwarded = getSessionCookieOptions(
      createRequest("http", {
        "x-forwarded-proto": "http",
      } as Request["headers"])
    );
    expect(forwarded.secure).toBe(false);
  });
});
