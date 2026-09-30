import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integerations/supabase/client";

type AdminPage = "trips" | "bookings" | "meetups" | "itineraries";

export function AdminAreaLayout({
  activePage,
  children,
}: {
  activePage: AdminPage;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [access, setAccess] = useState(false);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const redirectToAdminSignIn = () => {
      if (!active) return;
      setAccess(false);
      void navigate({ to: "/admin", replace: true });
    };

    const verifyAccess = async (accessToken: string | undefined) => {
      const currentRequestId = ++requestId;
      if (!accessToken) {
        redirectToAdminSignIn();
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
          redirectToAdminSignIn();
          return;
        }
        setAccess(true);
      } catch {
        redirectToAdminSignIn();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (event === "SIGNED_OUT" || !session) redirectToAdminSignIn();
        else void verifyAccess(session.access_token);
      }, 0);
    });

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) redirectToAdminSignIn();
      else void verifyAccess(session?.access_token);
    });

    return () => {
      active = false;
      requestId += 1;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!access) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#faf7ef] px-6 text-center text-sm text-muted-foreground">
        Checking administrator access…
      </main>
    );
  }

  return (
    <>
      <Navbar activePage={activePage} variant="light" adminArea />
      {children}
    </>
  );
}
