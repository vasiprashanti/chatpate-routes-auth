import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integerations/supabase/client";

export const Route = createFileRoute("/admin/meetups")({
  component: AdminMeetupsLayout,
});

function AdminMeetupsLayout() {
  const navigate = useNavigate();
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const returnToAdminSignIn = () => {
      if (!active) return;
      setAccess("denied");
      void navigate({ to: "/admin", replace: true });
    };

    const verifyAccess = async (accessToken: string | undefined) => {
      const currentRequestId = ++requestId;
      if (!accessToken) {
        returnToAdminSignIn();
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const account = (await response.json()) as { isAdmin?: boolean };
        if (!active || currentRequestId !== requestId) return;
        if (!response.ok || account.isAdmin !== true) {
          returnToAdminSignIn();
          return;
        }
        setAccess("allowed");
      } catch {
        returnToAdminSignIn();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (event === "SIGNED_OUT" || !session) returnToAdminSignIn();
        else void verifyAccess(session.access_token);
      }, 0);
    });

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) returnToAdminSignIn();
      else void verifyAccess(session?.access_token);
    });

    return () => {
      active = false;
      requestId += 1;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (access !== "allowed") {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#faf7ef] px-6 text-center text-sm text-muted-foreground">
        {access === "checking" ? "Checking administrator access…" : null}
      </main>
    );
  }

  return (
    <>
      <Navbar activePage="trips" variant="light" />
      <Outlet />
    </>
  );
}
