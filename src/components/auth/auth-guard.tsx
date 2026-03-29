"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import { triggerPageLoader } from "@/lib/page-loader-events";
import { supabase } from "@/lib/supabase-client";

type AuthGuardProps = {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
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

    async function hasRequiredRole() {
      if (!requiredRole) {
        return true;
      }

      const role = await fetchRoleForCurrentUser(supabase);
      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      return role ? requiredRoles.includes(role) : false;
    }

    async function checkAuth() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!isMounted) return;

      if (session?.user) {
        const allowedByRole = await hasRequiredRole();

        if (!isMounted) return;

        if (!allowedByRole) {
          setIsAllowed(false);
          setIsChecking(false);
          triggerPageLoader();
          router.replace(unauthorizedRedirectTo);
          return;
        }

        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      setIsAllowed(false);
      setIsChecking(false);
      triggerPageLoader();
      router.replace("/auth/login");
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const allowedByRole = await hasRequiredRole();

        if (!isMounted) return;

        if (!allowedByRole) {
          setIsAllowed(false);
          setIsChecking(false);
          triggerPageLoader();
          router.replace(unauthorizedRedirectTo);
          return;
        }

        setIsAllowed(true);
        setIsChecking(false);
        return;
      }

      setIsAllowed(false);
      triggerPageLoader();
      router.replace("/auth/login");
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [requiredRole, router, unauthorizedRedirectTo]);

  if (isChecking || !isAllowed) {
    return (
      <PageLoader
        label="Checking your session..."
        hint="Please wait while BEN10 verifies your access."
      />
    );
  }

  return <>{children}</>;
}
