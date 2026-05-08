"use server";

import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { signupSchema } from "@/lib/schemas/auth";
import type { ActionResult } from "@/lib/types";

export async function registerUser(
  input: unknown
): Promise<ActionResult<void>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, password } = parsed.data;

  try {
    await connectDB();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return {
        success: false,
        error: "An account with this email already exists.",
        fieldErrors: { email: ["An account with this email already exists."] },
      };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ name, email, passwordHash });

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[registerUser] failed to create user", {
      errorName: (err as Error).name,
    });
    return { success: false, error: "Failed to create account. Please try again." };
  }
}
