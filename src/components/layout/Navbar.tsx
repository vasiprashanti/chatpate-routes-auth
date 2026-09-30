import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integerations/supabase/client";
import { handleLogout } from "@/lib/auth";
import "./Navbar.css";

type NavbarProps = {
  activePage?: "trips" | "about" | "contact";
  variant?: "overlay" | "light";
};

type AccountState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "unavailable" }
  | {
      status: "signed-in";
      email: string;
      role: "checking" | "admin" | "user" | "unavailable";
    };

const LOGIN_HREF = "/login?redirect=%2Ftrips";

const navItems = [
  { href: "/trips", label: "Trips", num: "01", page: "trips" },
  { href: "/#about", label: "About", num: "02", page: "about" },
  { href: "/contact", label: "Contact", num: "03", page: "contact" },
] as const;

export function Navbar({ activePage, variant = "overlay" }: NavbarProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [account, setAccount] = useState<AccountState>({ status: "loading" });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const accountMenuRef = useRef<HTMLLIElement>(null);

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 12);

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const syncAccount = (session: Session | null) => {
      const currentRequestId = ++requestId;

      if (!session) {
        setAccount({ status: "signed-out" });
        return;
      }

      const email = session.user.email ?? "Google account";
      setAccount({ status: "signed-in", email, role: "checking" });

      void fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Account role could not be checked.");
          return (await response.json()) as { isAdmin?: boolean };
        })
        .then((result) => {
          if (!active || currentRequestId !== requestId) return;
          setAccount({
            status: "signed-in",
            email,
            role: result.isAdmin === true ? "admin" : "user",
          });
        })
        .catch(() => {
          if (!active || currentRequestId !== requestId) return;
          setAccount({ status: "signed-in", email, role: "unavailable" });
        });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer work out of Supabase's auth callback to avoid blocking auth events.
      window.setTimeout(() => {
        if (active) syncAccount(session);
      }, 0);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!active) return;
        if (error) {
          setAccount({ status: "unavailable" });
          return;
        }
        syncAccount(session);
      })
      .catch(() => {
        if (active) setAccount({ status: "unavailable" });
      });

    return () => {
      active = false;
      requestId += 1;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", isMenuOpen);

    return () => document.body.classList.remove("menu-open");
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAccountMenuOpen]);

  const signOut = async () => {
    setSignOutError("");
    setIsSigningOut(true);

    try {
      await handleLogout();
      closeMenu();
      setIsAccountMenuOpen(false);
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const isSignedIn = account.status === "signed-in";
  const email = isSignedIn ? account.email : "";
  const isAdmin = isSignedIn && account.role === "admin";
  const mobileNavItems = [
    ...navItems,
    ...(isSignedIn ? [{ href: "/dashboard/bookings", label: "My Bookings", num: "04" }] : []),
    ...(isAdmin ? [{ href: "/admin/trips", label: "Admin", num: "05" }] : []),
  ];

  return (
    <>
      <nav
        className={`navbar global-site-navbar${
          variant === "light" ? " navbar-light" : ""
        }${isScrolled ? " navbar-scrolled" : ""}`}
        aria-label="Main navigation"
      >
        <a href="/" className="nav-brand" onClick={closeMenu}>
          Chatpate Routes
        </a>

        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={activePage === item.page ? "active" : undefined}
                onClick={closeMenu}
              >
                {item.label}
              </a>
            </li>
          ))}
          {account.status === "unavailable" ? (
            <>
              <li>
                <a href={LOGIN_HREF} className="nav-cta" onClick={closeMenu}>
                  Sign in
                </a>
              </li>
            </>
          ) : account.status === "signed-out" ? (
            <>
              <li>
                <a href={LOGIN_HREF} className="nav-cta" onClick={closeMenu}>
                  Join Trip
                </a>
              </li>
              <li>
                <a href={LOGIN_HREF} className="nav-sign-in" onClick={closeMenu}>
                  Sign in
                </a>
              </li>
            </>
          ) : account.status === "signed-in" ? (
            <li className="nav-account-menu" ref={accountMenuRef}>
              <button
                type="button"
                className="nav-account-trigger"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                aria-expanded={isAccountMenuOpen}
                aria-controls="desktop-account-menu"
              >
                <span className="nav-account-indicator" aria-hidden="true" />
                {isAdmin ? "Admin" : "Signed in"}
                <span className="nav-account-chevron" aria-hidden="true">
                  ⌄
                </span>
              </button>
              <div
                id="desktop-account-menu"
                className="nav-account-popover"
                hidden={!isAccountMenuOpen}
              >
                <p className="nav-account-popover-email" title={email}>
                  {email}
                </p>
                <a href="/dashboard/bookings" onClick={() => setIsAccountMenuOpen(false)}>
                  My Bookings
                </a>
                {isAdmin ? (
                  <a href="/admin/trips" onClick={() => setIsAccountMenuOpen(false)}>
                    Admin
                  </a>
                ) : account.role === "checking" ? (
                  <span className="nav-account-popover-status">Checking admin access…</span>
                ) : null}
                {account.role === "unavailable" ? (
                  <span className="nav-account-popover-status">Admin access unavailable</span>
                ) : null}
                <button type="button" onClick={signOut} disabled={isSigningOut}>
                  {isSigningOut ? "Signing out…" : "Sign out"}
                </button>
                {signOutError ? (
                  <p className="nav-account-error" role="alert">
                    {signOutError}
                  </p>
                ) : null}
              </div>
            </li>
          ) : account.status === "loading" ? (
            <li className="nav-account-status" aria-live="polite">
              Checking account…
            </li>
          ) : null}
        </ul>

        <button
          type="button"
          className="hamburger"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div
        id="mobile-navigation"
        className={`mobile-menu${isMenuOpen ? " active" : ""}`}
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-top">
          <a href="/" className="mobile-menu-brand" onClick={closeMenu}>
            Chatpate Routes
          </a>
          <button type="button" className="menu-close" onClick={closeMenu} aria-label="Close menu">
            <span />
            <span />
          </button>
        </div>

        <div className="mobile-menu-links">
          {mobileNavItems.map((item) => (
            <a
              key={item.num}
              href={item.href}
              className={"page" in item && activePage === item.page ? "active" : undefined}
              onClick={closeMenu}
            >
              <span>{item.num}</span>
              {item.label}
            </a>
          ))}
        </div>

        <a
          href={isSignedIn ? "/trips" : LOGIN_HREF}
          className="mobile-menu-cta"
          onClick={closeMenu}
        >
          {isSignedIn ? "BROWSE TRIPS" : "Login"}
        </a>
        {isSignedIn ? (
          <button
            type="button"
            className="mobile-menu-logout"
            onClick={signOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Logging out…" : "Logout"}
          </button>
        ) : null}
        {signOutError ? (
          <p className="nav-auth-error" role="alert">
            {signOutError}
          </p>
        ) : null}
      </div>
    </>
  );
}

export default Navbar;
