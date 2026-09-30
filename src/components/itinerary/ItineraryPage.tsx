import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Map, Plus, X } from "lucide-react";
import { supabase } from "@/integerations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { SiteFooter } from "@/components/home/HomeSections";
import "@/styles/home.css";
import "./itinerary.css";

type Submission = {
  id: string;
  title: string;
  destination: string;
  duration: string;
  travel_months: string[];
  review_status: string;
  payment_status: string;
  created_at: string;
};

const statusLabel = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ItineraryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsSignedIn(Boolean(session));
      const response = await fetch("/api/itinerary-submissions", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        cache: "no-store",
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        submissions?: Submission[];
      };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not load your submissions.");
      setSubmissions(result.submissions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  return (
    <div className="itinerary-page">
      <Navbar variant="light" />
      <main className="itinerary-content">
        <p className="itinerary-eyebrow">Share the route</p>
        <h1>Your travel story could be someone else’s next trip.</h1>
        <p className="itinerary-intro">
          Send us a route, a hidden gem or a detailed itinerary. Our team will review it and get in
          touch.
        </p>

        <section className="itinerary-submit-banner">
          <div className="itinerary-banner-icon">
            <Map size={23} />
          </div>
          <div>
            <span>Have a route worth sharing?</span>
            <h2>Make a new submission</h2>
            <p>Enter the details yourself or upload a PDF. Flexible travel months are welcome.</p>
          </div>
          <Link className="itinerary-primary-button" to="/itinerary/submit">
            <Plus size={17} /> Submit an Itinerary <ArrowRight size={16} />
          </Link>
        </section>

        <section className="itinerary-history">
          <header>
            <div>
              <p className="itinerary-eyebrow">Your submissions</p>
              <h2>My Submitted Itineraries</h2>
            </div>
            {!isSignedIn ? (
              <Link to="/login" className="itinerary-text-link">
                Sign in to see yours <ArrowRight size={15} />
              </Link>
            ) : null}
          </header>
          {error ? (
            <p className="itinerary-error" role="alert">
              {error}
            </p>
          ) : null}
          {isLoading ? (
            <div className="itinerary-empty">Loading submissions…</div>
          ) : isSignedIn && submissions.length ? (
            <div className="itinerary-submission-list">
              {submissions.map((submission) => (
                <button key={submission.id} type="button" onClick={() => setSelected(submission)}>
                  <span>
                    <strong>{submission.title}</strong>
                    <small>
                      {submission.destination} · {submission.duration}
                    </small>
                  </span>
                  <span className={`itinerary-status itinerary-status-${submission.review_status}`}>
                    {statusLabel(submission.review_status)}
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <div className="itinerary-empty">
              <Map size={27} />
              <strong>No itineraries yet</strong>
              <p>Your submissions and review updates will appear here.</p>
              <Link to="/itinerary/submit" className="itinerary-primary-button">
                Submit your first itinerary <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
      {selected ? (
        <div
          className="itinerary-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="itinerary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-title"
          >
            <header>
              <h2 id="submission-title">Submission status</h2>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <h3>{selected.title}</h3>
            <p>
              {selected.destination} · {selected.duration}
            </p>
            <dl>
              <div>
                <dt>Travel months</dt>
                <dd>{selected.travel_months.join(", ") || "—"}</dd>
              </div>
              <div>
                <dt>Review status</dt>
                <dd>{statusLabel(selected.review_status)}</dd>
              </div>
              <div>
                <dt>Payment status</dt>
                <dd>{statusLabel(selected.payment_status)}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>
                  {new Date(selected.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  );
}
