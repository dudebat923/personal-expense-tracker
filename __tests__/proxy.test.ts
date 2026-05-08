// Tests for proxy.ts (the Next.js middleware).
//
// Strategy: we intercept the `withAuth` call so we can extract and directly
// invoke the two functions that hold all the decision logic:
//   1. The `authorized` callback  — decides whether a request is allowed.
//   2. The inner middleware function — handles post-auth redirects.
//
// We never execute the real withAuth wrapper; that is next-auth's concern and
// is already tested by the library itself.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// ---------------------------------------------------------------------------
// Types for the captured arguments passed to withAuth
// ---------------------------------------------------------------------------

type AuthorizedCallback = (params: {
  token: JWT | null;
  req: { nextUrl: { pathname: string } };
}) => boolean;

type MiddlewareFunction = (
  req: NextRequest & { nextauth: { token: JWT | null } }
) => ReturnType<typeof NextResponse.next>;

interface WithAuthOptions {
  callbacks?: { authorized?: AuthorizedCallback };
  pages?: { signIn?: string };
}

let capturedMiddleware: MiddlewareFunction | null = null;
let capturedOptions: WithAuthOptions | null = null;

// ---------------------------------------------------------------------------
// Mock next-auth/middleware BEFORE importing proxy.ts
// ---------------------------------------------------------------------------

jest.mock("next-auth/middleware", () => ({
  withAuth: jest.fn(
    (middlewareFn: MiddlewareFunction, options: WithAuthOptions) => {
      capturedMiddleware = middlewareFn;
      capturedOptions = options;
      // Return a dummy handler; we only care about the captured arguments
      return jest.fn();
    }
  ),
}));

// ---------------------------------------------------------------------------
// Import proxy.ts — this triggers the withAuth call and populates our captures
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("@/proxy");

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

function makeReq(pathname: string, token: JWT | null = null) {
  const url = `http://localhost${pathname}`;
  const req = {
    nextUrl: new URL(url),
    url,
    nextauth: { token },
  } as unknown as NextRequest & { nextauth: { token: JWT | null } };
  return req;
}

const mockToken: JWT = { sub: "user-id", id: "user-id" };

// ---------------------------------------------------------------------------
// authorized callback
// ---------------------------------------------------------------------------

describe("proxy › authorized callback", () => {
  let authorized: AuthorizedCallback;

  beforeAll(() => {
    if (!capturedOptions?.callbacks?.authorized) {
      throw new Error(
        "authorized callback was not captured — check withAuth mock setup"
      );
    }
    authorized = capturedOptions.callbacks.authorized;
  });

  it("returns false for an unauthenticated request to a protected path", () => {
    const result = authorized({
      token: null,
      req: { nextUrl: { pathname: "/dashboard" } },
    });

    expect(result).toBe(false);
  });

  it("returns true for an unauthenticated request to /signup (public route)", () => {
    const result = authorized({
      token: null,
      req: { nextUrl: { pathname: "/signup" } },
    });

    expect(result).toBe(true);
  });

  it("returns true for an authenticated request to any path", () => {
    const result = authorized({
      token: mockToken,
      req: { nextUrl: { pathname: "/dashboard" } },
    });

    expect(result).toBe(true);
  });

  it("returns true for an authenticated request to /login", () => {
    const result = authorized({
      token: mockToken,
      req: { nextUrl: { pathname: "/login" } },
    });

    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// inner middleware function
// ---------------------------------------------------------------------------

describe("proxy › inner middleware function (authenticated redirects)", () => {
  let middlewareFn: MiddlewareFunction;

  beforeAll(() => {
    if (!capturedMiddleware) {
      throw new Error(
        "middleware function was not captured — check withAuth mock setup"
      );
    }
    middlewareFn = capturedMiddleware;
  });

  beforeEach(() => {
    jest.spyOn(NextResponse, "redirect");
    jest.spyOn(NextResponse, "next");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("redirects an authenticated user visiting /login to /dashboard", () => {
    const req = makeReq("/login", mockToken);
    const redirectSpy = jest
      .spyOn(NextResponse, "redirect")
      .mockReturnValue({} as ReturnType<typeof NextResponse.redirect>);

    middlewareFn(req);

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    const redirectArg = redirectSpy.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe("/dashboard");
  });

  it("redirects an authenticated user visiting /signup to /dashboard", () => {
    const req = makeReq("/signup", mockToken);
    const redirectSpy = jest
      .spyOn(NextResponse, "redirect")
      .mockReturnValue({} as ReturnType<typeof NextResponse.redirect>);

    middlewareFn(req);

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    const redirectArg = redirectSpy.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe("/dashboard");
  });

  it("passes through an authenticated request to a non-auth path", () => {
    const req = makeReq("/dashboard", mockToken);
    const nextSpy = jest
      .spyOn(NextResponse, "next")
      .mockReturnValue({} as ReturnType<typeof NextResponse.next>);

    middlewareFn(req);

    expect(nextSpy).toHaveBeenCalledTimes(1);
  });

  it("passes through an authenticated request to /expenses", () => {
    const req = makeReq("/expenses", mockToken);
    const nextSpy = jest
      .spyOn(NextResponse, "next")
      .mockReturnValue({} as ReturnType<typeof NextResponse.next>);
    const redirectSpy = jest.spyOn(NextResponse, "redirect");

    middlewareFn(req);

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(redirectSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Static configuration
// ---------------------------------------------------------------------------

describe("proxy › static configuration", () => {
  it("exports a config object with the correct matcher pattern", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/proxy") as { config: { matcher: string[] } };
    expect(mod.config.matcher).toEqual([
      "/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)",
    ]);
  });

  it("sets signIn page to /login in the withAuth options", () => {
    expect(capturedOptions?.pages?.signIn).toBe("/login");
  });
});
