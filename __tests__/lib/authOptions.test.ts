// We test only the pure callback logic extracted from authOptions.
// The `authorize` function and the jwt/session callbacks are the testable surface.
// We mock every I/O dependency so tests are fast and hermetic.

import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that trigger the modules
// ---------------------------------------------------------------------------

jest.mock("@/lib/db", () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/models/User", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are registered)
// ---------------------------------------------------------------------------

import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockFindOne = User.findOne as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;

// Pull the authorize function from the first configured provider
function getAuthorize() {
  const provider = authOptions.providers[0] as {
    options?: {
      authorize?: (
        credentials: Record<string, string> | undefined
      ) => Promise<{ id: string; name: string; email: string } | null>;
    };
  };
  const authorize = provider.options?.authorize;
  if (!authorize) throw new Error("authorize not found on provider");
  return authorize;
}

// Pull the jwt callback
function getJwtCallback() {
  const jwt = authOptions.callbacks?.jwt;
  if (!jwt) throw new Error("jwt callback not configured");
  return jwt;
}

// Pull the session callback
function getSessionCallback() {
  const session = authOptions.callbacks?.session;
  if (!session) throw new Error("session callback not configured");
  return session;
}

// ---------------------------------------------------------------------------
// authorize()
// ---------------------------------------------------------------------------

describe("authOptions › authorize()", () => {
  const authorize = getAuthorize();

  const validCredentials = {
    email: "user@example.com",
    password: "correct-password",
  };

  const dbUser = {
    _id: { toString: () => "abc123" },
    name: "Test User",
    email: "user@example.com",
    passwordHash: "$2b$12$hashedvalue",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
  });

  it("returns null when credentials are undefined", async () => {
    const result = await authorize(undefined);

    expect(result).toBeNull();
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it("returns null when email is an empty string", async () => {
    const result = await authorize({ email: "", password: "somepassword" });

    expect(result).toBeNull();
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it("returns null when password is an empty string", async () => {
    const result = await authorize({
      email: "user@example.com",
      password: "",
    });

    expect(result).toBeNull();
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it("returns null when no user is found in the database", async () => {
    mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const result = await authorize(validCredentials);

    expect(result).toBeNull();
    expect(mockConnectDB).toHaveBeenCalledTimes(1);
    expect(mockFindOne).toHaveBeenCalledWith({ email: validCredentials.email });
  });

  it("returns null when bcrypt comparison fails (wrong password)", async () => {
    mockFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(dbUser),
    });
    mockBcryptCompare.mockResolvedValue(false as never);

    const result = await authorize(validCredentials);

    expect(result).toBeNull();
    expect(mockBcryptCompare).toHaveBeenCalledWith(
      validCredentials.password,
      dbUser.passwordHash
    );
  });

  it("returns the user object when credentials are valid", async () => {
    mockFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(dbUser),
    });
    mockBcryptCompare.mockResolvedValue(true as never);

    const result = await authorize(validCredentials);

    expect(result).toEqual({
      id: "abc123",
      name: "Test User",
      email: "user@example.com",
    });
  });

  it("calls connectDB before querying the database", async () => {
    mockFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    const callOrder: string[] = [];
    mockConnectDB.mockImplementation(async () => {
      callOrder.push("connectDB");
    });
    mockFindOne.mockReturnValue({
      lean: jest.fn().mockImplementation(async () => {
        callOrder.push("findOne");
        return null;
      }),
    });

    await authorize(validCredentials);

    expect(callOrder).toEqual(["connectDB", "findOne"]);
  });
});

// ---------------------------------------------------------------------------
// jwt callback
// ---------------------------------------------------------------------------

describe("authOptions › jwt callback", () => {
  const jwtCallback = getJwtCallback();

  it("embeds user.id into the token on the first sign-in (when user is present)", () => {
    const token: JWT = { sub: "existing-sub" };
    const user = { id: "user-db-id", name: "Jane", email: "jane@example.com" };

    // The callback signature is `jwt({ token, user, ... })`.
    // We cast to any here only for the test helper call, not for our assertions.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = jwtCallback({ token, user } as any);

    expect((result as JWT & { id: string }).id).toBe("user-db-id");
  });

  it("leaves the token unchanged when user is not present (subsequent requests)", () => {
    const token: JWT & { id: string } = { sub: "existing-sub", id: "user-db-id" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = jwtCallback({ token } as any);

    expect((result as JWT & { id: string }).id).toBe("user-db-id");
  });

  it("returns the token as-is when there is no user and no existing id", () => {
    const token: JWT = { sub: "existing-sub" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = jwtCallback({ token } as any);

    expect(result).toEqual(token);
  });
});

// ---------------------------------------------------------------------------
// session callback
// ---------------------------------------------------------------------------

describe("authOptions › session callback", () => {
  const sessionCallback = getSessionCallback();

  function makeSession(): Session {
    return {
      user: { name: "Jane", email: "jane@example.com", id: "" },
      expires: "2099-01-01",
    };
  }

  it("copies token.id onto session.user.id", () => {
    const session = makeSession();
    const token: JWT & { id: string } = { sub: "sub-value", id: "user-db-id" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = sessionCallback({ session, token } as any) as Session & {
      user: { id: string };
    };

    expect(result.user.id).toBe("user-db-id");
  });

  it("does not overwrite session.user.id when token has no id field", () => {
    const session = makeSession();
    session.user.id = "pre-existing-id";
    const token: JWT = { sub: "sub-value" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = sessionCallback({ session, token } as any) as Session & {
      user: { id: string };
    };

    // token.id is undefined so the `if (token.id)` guard is false → unchanged
    expect(result.user.id).toBe("pre-existing-id");
  });

  it("returns the session object (not a new object)", () => {
    const session = makeSession();
    const token: JWT & { id: string } = { sub: "sub-value", id: "abc" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = sessionCallback({ session, token } as any);

    expect(result).toBe(session);
  });
});

// ---------------------------------------------------------------------------
// Static configuration assertions
// ---------------------------------------------------------------------------

describe("authOptions › static configuration", () => {
  it("uses jwt session strategy", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  it("sets the signIn page to /login", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
  });

  it("sets the error page to /login", () => {
    expect(authOptions.pages?.error).toBe("/login");
  });
});
