import { loginSchema, signupSchema } from "@/lib/schemas/auth";

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------

describe("loginSchema", () => {
  describe("valid input", () => {
    it("accepts a well-formed email and a non-empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "secret123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
        expect(result.data.password).toBe("secret123");
      }
    });
  });

  describe("email field", () => {
    it("fails when email is an empty string", () => {
      const result = loginSchema.safeParse({ email: "", password: "secret" });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.flatten().fieldErrors.email ?? [];
        expect(emailErrors).toContain("Email is required.");
      }
    });

    it("fails when email has no @ symbol", () => {
      const result = loginSchema.safeParse({
        email: "not-an-email",
        password: "secret",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.flatten().fieldErrors.email ?? [];
        expect(emailErrors).toContain("Enter a valid email address.");
      }
    });

    it("fails when email is missing the domain part", () => {
      const result = loginSchema.safeParse({
        email: "user@",
        password: "secret",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.flatten().fieldErrors.email ?? [];
        expect(emailErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("password field", () => {
    it("fails when password is an empty string", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordErrors =
          result.error.flatten().fieldErrors.password ?? [];
        expect(passwordErrors).toContain("Password is required.");
      }
    });

    it("accepts a single-character password (no minimum length on login)", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "x",
      });

      // loginSchema only requires the field to be non-empty — no length minimum
      expect(result.success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// signupSchema
// ---------------------------------------------------------------------------

describe("signupSchema", () => {
  const validInput = {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "securepassword",
    confirmPassword: "securepassword",
  };

  describe("valid input", () => {
    it("accepts all required fields when they satisfy every constraint", () => {
      const result = signupSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Jane Smith");
        expect(result.data.email).toBe("jane@example.com");
      }
    });

    it("accepts a name that is exactly 100 characters", () => {
      const result = signupSchema.safeParse({
        ...validInput,
        name: "a".repeat(100),
      });

      expect(result.success).toBe(true);
    });

    it("accepts a password that is exactly 8 characters", () => {
      const result = signupSchema.safeParse({
        ...validInput,
        password: "12345678",
        confirmPassword: "12345678",
      });

      expect(result.success).toBe(true);
    });

    it("accepts a password that is exactly 72 characters", () => {
      const longPassword = "a".repeat(72);
      const result = signupSchema.safeParse({
        ...validInput,
        password: longPassword,
        confirmPassword: longPassword,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("name field", () => {
    it("fails when name is an empty string", () => {
      const result = signupSchema.safeParse({ ...validInput, name: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        const nameErrors = result.error.flatten().fieldErrors.name ?? [];
        expect(nameErrors).toContain("Full name is required.");
      }
    });

    it("fails when name exceeds 100 characters", () => {
      const result = signupSchema.safeParse({
        ...validInput,
        name: "a".repeat(101),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const nameErrors = result.error.flatten().fieldErrors.name ?? [];
        expect(nameErrors).toContain("Name must be 100 characters or fewer.");
      }
    });
  });

  describe("email field", () => {
    it("fails when email is an empty string", () => {
      const result = signupSchema.safeParse({ ...validInput, email: "" });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.flatten().fieldErrors.email ?? [];
        expect(emailErrors).toContain("Email is required.");
      }
    });

    it("fails when email is not a valid address", () => {
      const result = signupSchema.safeParse({
        ...validInput,
        email: "not-an-email",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.flatten().fieldErrors.email ?? [];
        expect(emailErrors).toContain("Enter a valid email address.");
      }
    });
  });

  describe("password field", () => {
    it("fails when password is shorter than 8 characters", () => {
      const result = signupSchema.safeParse({
        ...validInput,
        password: "short",
        confirmPassword: "short",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordErrors =
          result.error.flatten().fieldErrors.password ?? [];
        expect(passwordErrors).toContain(
          "Password must be at least 8 characters."
        );
      }
    });

    it("fails when password exceeds 72 characters", () => {
      const tooLong = "a".repeat(73);
      const result = signupSchema.safeParse({
        ...validInput,
        password: tooLong,
        confirmPassword: tooLong,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordErrors =
          result.error.flatten().fieldErrors.password ?? [];
        expect(passwordErrors).toContain(
          "Password must be 72 characters or fewer."
        );
      }
    });
  });

  describe("confirmPassword field", () => {
    it("fails when confirmPassword is an empty string", () => {
      const result = signupSchema.safeParse({
        ...validInput,
        confirmPassword: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmErrors =
          result.error.flatten().fieldErrors.confirmPassword ?? [];
        expect(confirmErrors.length).toBeGreaterThan(0);
      }
    });

    it("fails when confirmPassword does not match password and attaches the error to confirmPassword", () => {
      const result = signupSchema.safeParse({
        ...validInput,
        confirmPassword: "different-password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmErrors =
          result.error.flatten().fieldErrors.confirmPassword ?? [];
        expect(confirmErrors).toContain("Passwords do not match.");
        // The error must NOT be on the password field itself
        const passwordErrors =
          result.error.flatten().fieldErrors.password ?? [];
        expect(passwordErrors).not.toContain("Passwords do not match.");
      }
    });
  });
});
