"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase-client";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/login?verified=1`
        : undefined;
    const defaultDisplayName = trimmedEmail.split("@")[0] || "Player";

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: defaultDisplayName,
          role: "customer",
        },
      },
    });

    setIsLoading(false);

    if (signUpError) {
      const message = signUpError.message.toLowerCase();

      if (message.includes("already registered")) {
        setError("This email is already registered. Please log in.");
        return;
      }

      setError(signUpError.message);
      return;
    }

    // Supabase can return a masked "success" with no identities when the email
    // is already registered (anti-enumeration behavior), and no new email is sent.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("This email is already registered. Please log in or reset your password.");
      return;
    }

    if (!data.user) {
      setError("Could not create account right now. Please try again.");
      return;
    }

    setSuccess(
      "A verification email has been sent. Confirm your email, then you will be redirected to login."
    );
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="auth-page">
      <div className="shell">
        <section className="auth-card">
          <h1>Create your BEN10 account</h1>
          <p>
            Sign up with your email and password. We will send a verification
            email before login.
          </p>

          <form className="auth-form" onSubmit={handleSignUp}>
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />

            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />

            <label htmlFor="signup-confirm-password">Confirm password</label>
            <input
              id="signup-confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
            />

            {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
            {success ? (
              <p className="auth-feedback auth-feedback--success">{success}</p>
            ) : null}

            <button className="primary-button auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link href="/auth/login">Log In</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
