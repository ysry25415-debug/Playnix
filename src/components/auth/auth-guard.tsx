"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase-client";

type AppRole = "customer" | "seller" | "admin";

type AuthGuardProps = {
  children: ReactNode;
  requiredRole?: AppRole;
  unauthorizedRedirectTo?: string;
};

export function AuthGuard({
  children,
  requiredRole,
  unauthorizedRedirectTo = "/",
}: AuthGuardProps) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function hasRequiredRole(userId: string) {
      if (!requiredRole) {
        return true;
      }

      const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      return data?.role === requiredRole;
    }

    async function checkAuth() {
      const { data } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (data.user) {
        const allowedByRole = await hasRequiredRole(data.user.id);

        if (!isMounted) return;

        if (!allowedByRole) {
          setIsAllowed(false);
          setIsChecking(false);
          router.replace(unauthorizedRedirectTo);
          return;
        }

        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      setIsAllowed(false);
      setIsChecking(false);
      router.replace("/auth/login");
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const allowedByRole = await hasRequiredRole(session.user.id);

        if (!isMounted) return;

        if (!allowedByRole) {
          setIsAllowed(false);
          setIsChecking(false);
          router.replace(unauthorizedRedirectTo);
          return;
        }

        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      setIsAllowed(false);
      router.replace("/auth/login");
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [requiredRole, router, unauthorizedRedirectTo]);

  if (isChecking || !isAllowed) {
    return (
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card">
            <h1>Checking your session...</h1>
            <p>Please wait while we verify your account access.</p>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
