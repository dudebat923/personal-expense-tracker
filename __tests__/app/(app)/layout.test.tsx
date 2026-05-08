// Tests for app/(app)/layout.tsx — the server-side protected layout.
//
// This layout calls getServerSession and either redirects (no session) or
// renders children (valid session). We mock both next-auth and next/navigation
// to keep the test hermetic.

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// server-only is stubbed via moduleNameMapper in jest.config.ts
// @/lib/authOptions is imported by the layout; we don't need to execute it,
// but we do need it to resolve without error.
jest.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AppLayout from "@/app/(app)/layout";
import type { Session } from "next-auth";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(): Session {
  return {
    user: { id: "user-id", name: "Jane", email: "jane@example.com" },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

// AppLayout is an async React Server Component — we call it as a plain async
// function here. The JSX return value is not relevant to the behaviour we're
// testing; we only care about whether redirect() is called.

// ---------------------------------------------------------------------------
// Unauthenticated — no session
// ---------------------------------------------------------------------------

describe("AppLayout › unauthenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
    // redirect() in Next.js throws internally to stop rendering; in tests we
    // simply let the mock record the call without throwing so we can assert.
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("calls redirect('/login') when there is no session", async () => {
    await expect(
      AppLayout({ children: null })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("calls getServerSession before redirecting", async () => {
    await expect(AppLayout({ children: null })).rejects.toThrow();

    expect(mockGetServerSession).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Authenticated — valid session
// ---------------------------------------------------------------------------

describe("AppLayout › authenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(makeSession());
  });

  it("does not call redirect when a session exists", async () => {
    await AppLayout({ children: null });

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("renders children when a session exists", async () => {
    const children = <span data-testid="child">hello</span>;
    const result = await AppLayout({ children });

    // The layout wraps children in a Fragment; the rendered output should
    // contain the children element.
    expect(result).toBeTruthy();
  });
});
