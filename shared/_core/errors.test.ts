import { describe, expect, it } from "vitest";
import {
  BadRequestError,
  ForbiddenError,
  HttpError,
  NotFoundError,
  UnauthorizedError,
} from "./errors";

describe("HttpError", () => {
  it("carries the status code, message and name", () => {
    const error = new HttpError(418, "teapot");

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(418);
    expect(error.message).toBe("teapot");
    expect(error.name).toBe("HttpError");
    expect(error.stack).toBeTruthy();
  });
});

describe("convenience constructors", () => {
  it.each([
    [BadRequestError, 400],
    [UnauthorizedError, 401],
    [ForbiddenError, 403],
    [NotFoundError, 404],
  ])("maps to the expected status code", (factory, statusCode) => {
    const error = factory("nope");

    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(statusCode);
    expect(error.message).toBe("nope");
  });
});
