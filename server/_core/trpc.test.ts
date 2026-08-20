import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import type { User } from "../../drizzle/schema";
import type { TrpcContext } from "./context";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./trpc";

function createUser(role: User["role"]): User {
  return {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User;
}

function createContext(user: User | null): TrpcContext {
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

const testRouter = router({
  open: publicProcedure.query(() => "open"),
  me: protectedProcedure.query(({ ctx }) => ctx.user.email),
  admin: adminProcedure.query(({ ctx }) => ctx.user.role),
});

describe("publicProcedure", () => {
  it("runs without a user", async () => {
    await expect(
      testRouter.createCaller(createContext(null)).open()
    ).resolves.toBe("open");
  });
});

describe("protectedProcedure", () => {
  it("exposes the authenticated user to the resolver", async () => {
    const caller = testRouter.createCaller(createContext(createUser("user")));

    await expect(caller.me()).resolves.toBe("sample@example.com");
  });

  it("rejects anonymous callers as UNAUTHORIZED", async () => {
    const caller = testRouter.createCaller(createContext(null));

    await expect(caller.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  });
});

describe("adminProcedure", () => {
  it("allows admins through", async () => {
    const caller = testRouter.createCaller(createContext(createUser("admin")));

    await expect(caller.admin()).resolves.toBe("admin");
  });

  it("rejects non-admin users as FORBIDDEN", async () => {
    const caller = testRouter.createCaller(createContext(createUser("user")));

    await expect(caller.admin()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
    });
  });

  it("rejects anonymous callers as FORBIDDEN", async () => {
    const caller = testRouter.createCaller(createContext(null));

    await expect(caller.admin()).rejects.toBeInstanceOf(TRPCError);
  });
});
