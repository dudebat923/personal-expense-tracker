"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginSchema } from "@/lib/schemas/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const input = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        redirect: false,
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (result?.error) {
        setFormError("Invalid email or password.");
        return;
      }

      const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {formError && (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          aria-invalid={fieldErrors.email ? "true" : undefined}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 ${
            fieldErrors.email
              ? "border-red-500 focus:ring-2 focus:ring-red-500"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
          }`}
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          aria-invalid={fieldErrors.password ? "true" : undefined}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 ${
            fieldErrors.password
              ? "border-red-500 focus:ring-2 focus:ring-red-500"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
          }`}
        />
        {fieldErrors.password && (
          <p id="password-error" className="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.password[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your account
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
