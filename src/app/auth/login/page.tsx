"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase-client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const verifiedMessage = useMemo(() => {
    return searchParams.get("verified") === "1"
      ? "Your email is verified. You can log in now."
      : "";
  }, [searchParams]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Email format is not valid.");
      return;
    }

    setIsLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setIsLoading(false);

    if (loginError) {
      const message = loginError.message.toLowerCase();

      if (message.includes("email not confirmed")) {
        setError("Please confirm your email first, then try logging in.");
        return;
      }

      if (message.includes("invalid login credentials")) {
        setError("Login failed: email or password is incorrect.");
        return;
      }

      setError(loginError.message);
      return;
    }

    router.push("/marketplace");
  }

  return (
    <main className="auth-page">
      <div className="shell">
        <section className="auth-card">
          <h1>Welcome back to BEN10</h1>
          <p>Log in with your verified email and password.</p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />

            {verifiedMessage ? (
              <p className="auth-feedback auth-feedback--success">{verifiedMessage}</p>
            ) : null}
            {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

            <button className="primary-button auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="auth-switch">
            New here? <Link href="/auth/sign-up">Sign Up</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
