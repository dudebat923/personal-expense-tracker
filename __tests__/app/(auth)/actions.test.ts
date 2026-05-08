// Tests for the registerUser server action.
// All I/O is mocked — no real database or bcrypt work happens.

jest.mock("@/lib/db", () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/models/User", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

import { registerUser } from "@/app/(auth)/actions";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";

const mockFindOne = User.findOne as jest.Mock;
const mockCreate = User.create as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validInput = {
  name: "Jane Smith",
  email: "jane@example.com",
  password: "securepassword",
  confirmPassword: "securepassword",
};

// ---------------------------------------------------------------------------
// Validation failures (Zod layer)
// ---------------------------------------------------------------------------

describe("registerUser › Zod validation failures", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns success:false with fieldErrors when name is empty", async () => {
    const result = await registerUser({ ...validInput, name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.name).toBeDefined();
    }
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("returns success:false with fieldErrors when email is invalid", async () => {
    const result = await registerUser({ ...validInput, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Please fix the errors below.");
      expect(result.fieldErrors?.email).toBeDefined();
    }
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("returns success:false with fieldErrors when password is shorter than 8 characters", async () => {
    const result = await registerUser({
      ...validInput,
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.password).toBeDefined();
    }
  });

  it("returns success:false with fieldErrors when passwords do not match", async () => {
    const result = await registerUser({
      ...validInput,
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.confirmPassword).toBeDefined();
    }
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("returns success:false when the input is not an object", async () => {
    const result = await registerUser(null);

    expect(result.success).toBe(false);
  });

  it("does not touch the database when validation fails", async () => {
    await registerUser({ ...validInput, email: "" });

    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Duplicate email
// ---------------------------------------------------------------------------

describe("registerUser › duplicate email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "existing-id" }),
    });
  });

  it("returns success:false with a user-facing error message", async () => {
    const result = await registerUser(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "An account with this email already exists."
      );
    }
  });

  it("attaches the duplicate-email error to the email fieldErrors key", async () => {
    const result = await registerUser(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toContain(
        "An account with this email already exists."
      );
    }
  });

  it("does not call bcrypt.hash or User.create when the email is taken", async () => {
    await registerUser(validInput);

    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Successful registration
// ---------------------------------------------------------------------------

describe("registerUser › successful registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    mockBcryptHash.mockResolvedValue("$2b$12$hashed" as never);
    mockCreate.mockResolvedValue({});
  });

  it("returns { success: true, data: undefined }", async () => {
    const result = await registerUser(validInput);

    expect(result).toEqual({ success: true, data: undefined });
  });

  it("hashes the password with bcrypt before storing", async () => {
    await registerUser(validInput);

    expect(mockBcryptHash).toHaveBeenCalledWith(validInput.password, 12);
  });

  it("stores the hashed password, not the plaintext", async () => {
    await registerUser(validInput);

    const createCall = mockCreate.mock.calls[0][0] as {
      passwordHash: string;
      password?: string;
    };
    expect(createCall.passwordHash).toBe("$2b$12$hashed");
    expect(createCall.password).toBeUndefined();
  });

  it("creates the user with the correct name and email", async () => {
    await registerUser(validInput);

    const createCall = mockCreate.mock.calls[0][0] as {
      name: string;
      email: string;
    };
    expect(createCall.name).toBe(validInput.name);
    expect(createCall.email).toBe(validInput.email);
  });

  it("queries for an existing user by email before creating", async () => {
    await registerUser(validInput);

    expect(mockFindOne).toHaveBeenCalledWith({ email: validInput.email });
  });
});

// ---------------------------------------------------------------------------
// Unexpected database errors
// ---------------------------------------------------------------------------

describe("registerUser › unexpected database errors", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    mockBcryptHash.mockResolvedValue("$2b$12$hashed" as never);
    // Suppress the expected console.error from the source's catch block so
    // Jest output stays clean. We verify behavior via the return value, not logs.
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns success:false with a generic message when User.create throws", async () => {
    mockCreate.mockRejectedValue(new Error("MongoServerError"));

    const result = await registerUser(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Failed to create account. Please try again."
      );
      // Must not leak the raw error message to the caller
      expect(result.error).not.toContain("MongoServerError");
    }
  });

  it("does not include fieldErrors on an unexpected error", async () => {
    mockCreate.mockRejectedValue(new Error("MongoServerError"));

    const result = await registerUser(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toBeUndefined();
    }
  });
});
