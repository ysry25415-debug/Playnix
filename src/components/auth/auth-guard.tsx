"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase-client";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const { data } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (data.user) {
        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      setIsAllowed(false);
      setIsChecking(false);
      router.replace("/auth/login");
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
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
  }, [router]);

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
