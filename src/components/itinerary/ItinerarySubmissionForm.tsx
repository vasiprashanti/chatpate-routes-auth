import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, FileUp } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import QRCode from "@/components/common/QRCode";
import { supabase } from "@/integerations/supabase/client";
import {
  clearItineraryDraft,
  loadItineraryDraft,
  saveItineraryDraft,
  type ItineraryDraftData,
} from "@/lib/itinerary-draft";
import "./itinerary.css";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
type Method = "manual" | "pdf";
type FormData = ItineraryDraftData;
type SavedSubmission = { id: string; title: string; fee_amount: number };

const emptyForm = (): FormData => ({
  submission_method: "manual",
  title: "",
  destination: "",
  starting_location: "",
  travel_months: [],
  duration: "",
  estimated_budget: null,
  itinerary_details: "",
  additional_notes: "",
  cohost_interest: "maybe",
  submitter_name: "",
  email: "",
  phone: "",
  consent: false,
});

export default function ItinerarySubmissionForm() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [pdf, setPdf] = useState<File | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [submission, setSubmission] = useState<SavedSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const response = await fetch("/api/itinerary-submissions", {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          cache: "no-store",
        });
        const result = (await response.json()) as { success?: boolean; fee?: number | null };
        if (active && result.success) setFee(result.fee == null ? null : Number(result.fee));
        if (active && session?.user) {
          setForm((current) => ({
            ...current,
            submitter_name:
              current.submitter_name || String(session.user.user_metadata?.["full_name"] ?? ""),
            email: current.email || session.user.email || "",
          }));
        }
        if (new URLSearchParams(window.location.search).get("resume") === "1") {
          const draft = await loadItineraryDraft();
          if (active && draft) {
            setForm(draft.data);
            setPdf(draft.file);
            setNotice(
              "Your saved itinerary details are ready. Continue to the order summary when you’re ready.",
            );
          }
        }
      } catch (restoreError) {
        if (active)
          setError(
            restoreError instanceof Error
              ? restoreError.message
              : "Could not restore your saved form.",
          );
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  const change = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const toggleMonth = (month: string) => {
    const monthsSelected = form.travel_months.includes(month)
      ? form.travel_months.filter((item) => item !== month)
      : months.filter((item) => form.travel_months.includes(item) || item === month);
    change("travel_months", monthsSelected);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.travel_months.length) {
      setError("Select at least one travel month.");
      return;
    }
    if (
      form.submission_method === "pdf" &&
      (!pdf || pdf.type !== "application/pdf" || pdf.size > 10 * 1024 * 1024)
    ) {
      setError("Choose a PDF itinerary no larger than 10 MB.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      try {
        await saveItineraryDraft(form, pdf);
        const params = new URLSearchParams({ redirect: "/itinerary/submit?resume=1" });
        window.location.assign(`/login?${params.toString()}`);
      } catch {
        setError(
          "We couldn’t safely save your form for sign-in. Please try again before leaving this page.",
        );
      }
      return;
    }
    if (fee == null || !Number.isFinite(fee) || fee <= 0) {
      setError("The submission fee has not been configured yet. Please check back shortly.");
      return;
    }
    if (!form.travel_months.length) {
      setError("Select at least one travel month.");
      return;
    }
    if (
      form.submission_method === "manual" &&
      (!form.starting_location.trim() || !form.itinerary_details.trim() || !form.estimated_budget)
    ) {
      setError("Manual entries need a starting location, estimated budget and itinerary details.");
      return;
    }
    if (
      form.submission_method === "pdf" &&
      (!pdf || pdf.type !== "application/pdf" || pdf.size > 10 * 1024 * 1024)
    ) {
      setError("Choose a PDF itinerary no larger than 10 MB.");
      return;
    }

    setIsSubmitting(true);
    try {
      let pdfPath: string | null = null;
      if (form.submission_method === "pdf" && pdf) {
        pdfPath = `${session.user.id}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("itinerary-submissions")
          .upload(pdfPath, pdf, { contentType: "application/pdf", upsert: false });
        if (uploadError) throw new Error(uploadError.message || "Could not upload your PDF.");
      }

      const body = {
        ...form,
        starting_location: form.submission_method === "manual" ? form.starting_location.trim() : "",
        estimated_budget: form.submission_method === "manual" ? form.estimated_budget : null,
        itinerary_details:
          form.submission_method === "manual" ? form.itinerary_details.trim() : null,
        additional_notes: form.additional_notes.trim() || null,
        pdf_path: pdfPath,
        consent: form.consent,
      };
      const response = await fetch("/api/itinerary-submissions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        submission?: SavedSubmission;
      };
      if (!response.ok || !result.success || !result.submission)
        throw new Error(result.message || "Could not submit your itinerary.");
      await clearItineraryDraft();
      setSubmission(result.submission);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not submit your itinerary.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappText = submission
    ? `Hi Chatpate Routes, I submitted itinerary ${submission.id} (${submission.title}) and would like to share my UPI payment details for ₹${submission.fee_amount}.`
    : "";

  return (
    <div className="itinerary-page">
      <Navbar variant="light" />
      <main className="itinerary-content itinerary-form-page">
        <Link to="/itinerary" className="itinerary-back-link">
          <ArrowLeft size={16} /> Back to itineraries
        </Link>
        <p className="itinerary-eyebrow">Share your route</p>
        <h1>Tell us about the trip you’d love to share.</h1>
        <p className="itinerary-intro">
          Choose a manual itinerary or upload a PDF. You can suggest several months if your dates
          are flexible.
        </p>

        {submission ? (
          <section className="itinerary-payment-summary">
            <div className="itinerary-success-mark">
              <Check size={24} />
            </div>
            <p className="itinerary-eyebrow">Submission saved</p>
            <h2>Your route is with our team.</h2>
            <p>
              Reference <strong>{submission.id}</strong> · {submission.title}
            </p>
            <div className="itinerary-order-card">
              <h3>Order Summary</h3>
              <div>
                <span>Itinerary Submission Fee</span>
                <strong>₹{submission.fee_amount.toLocaleString("en-IN")}</strong>
              </div>
              <div className="itinerary-order-total">
                <span>Total</span>
                <strong>₹{submission.fee_amount.toLocaleString("en-IN")}</strong>
              </div>
            </div>
            <p className="itinerary-manual-payment-note">
              Complete payment using the QR code, then send your transaction details to the team on
              WhatsApp. Payment stays pending until an admin verifies it.
            </p>
            <div className="itinerary-payment-qr">
              <QRCode />
            </div>
            <a
              className="itinerary-primary-button"
              href={`https://wa.me/919266770149?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share payment details on WhatsApp <ArrowRight size={16} />
            </a>
            <Link to="/itinerary" className="itinerary-text-link">
              View my submissions
            </Link>
          </section>
        ) : (
          <form className="itinerary-form-card" onSubmit={(event) => void handleSubmit(event)}>
            {notice ? (
              <p className="itinerary-notice" role="status">
                {notice}
              </p>
            ) : null}
            <div className="itinerary-method-toggle" aria-label="Submission method">
              <button
                type="button"
                className={form.submission_method === "manual" ? "active" : ""}
                onClick={() => change("submission_method", "manual")}
              >
                Manual Entry
              </button>
              <button
                type="button"
                className={form.submission_method === "pdf" ? "active" : ""}
                onClick={() => change("submission_method", "pdf")}
              >
                Upload PDF
              </button>
            </div>
            <div className="itinerary-form-grid">
              <label>
                Itinerary Title
                <input
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={(event) => change("title", event.target.value)}
                />
              </label>
              <label>
                Destination / Route
                <input
                  required
                  maxLength={240}
                  value={form.destination}
                  onChange={(event) => change("destination", event.target.value)}
                  placeholder="e.g. Coastal Karnataka"
                />
              </label>
              {form.submission_method === "manual" ? (
                <label>
                  Starting Location
                  <input
                    required
                    maxLength={240}
                    value={form.starting_location}
                    onChange={(event) => change("starting_location", event.target.value)}
                  />
                </label>
              ) : null}
              <label>
                Duration
                <input
                  required
                  maxLength={100}
                  value={form.duration}
                  onChange={(event) => change("duration", event.target.value)}
                  placeholder="e.g. 4 days"
                />
              </label>
              {form.submission_method === "manual" ? (
                <label>
                  Estimated Budget Per Person (₹)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.estimated_budget ?? ""}
                    onChange={(event) =>
                      change(
                        "estimated_budget",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  />
                </label>
              ) : null}
            </div>
            <fieldset className="itinerary-month-picker">
              <legend>
                Travel Months <span>Select all that work</span>
              </legend>
              <div>
                {months.map((month) => (
                  <button
                    key={month}
                    type="button"
                    aria-pressed={form.travel_months.includes(month)}
                    className={form.travel_months.includes(month) ? "selected" : ""}
                    onClick={() => toggleMonth(month)}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
              <small>
                {form.travel_months.length
                  ? form.travel_months.join(", ")
                  : "Choose one or more months"}
              </small>
            </fieldset>
            {form.submission_method === "manual" ? (
              <>
                <label className="itinerary-full-field">
                  Itinerary Details
                  <textarea
                    required
                    minLength={10}
                    maxLength={12000}
                    rows={7}
                    value={form.itinerary_details}
                    onChange={(event) => change("itinerary_details", event.target.value)}
                    placeholder="Describe the route, activities, experiences and day-wise plan…"
                  />
                </label>
                <label className="itinerary-full-field">
                  Additional Notes <span>Optional</span>
                  <textarea
                    maxLength={4000}
                    rows={3}
                    value={form.additional_notes}
                    onChange={(event) => change("additional_notes", event.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="itinerary-pdf-upload">
                <FileUp size={22} />
                <span>
                  Upload itinerary PDF <small>PDF only · Up to 10 MB</small>
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
                />
                {pdf ? <strong>{pdf.name}</strong> : null}
              </label>
            )}

            <div className="itinerary-form-grid">
              <label>
                Co-hosting Interest
                <select
                  value={form.cohost_interest}
                  onChange={(event) =>
                    change("cohost_interest", event.target.value as FormData["cohost_interest"])
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="maybe">Maybe</option>
                </select>
              </label>
              <label>
                Your Name
                <input
                  required
                  maxLength={160}
                  value={form.submitter_name}
                  onChange={(event) => change("submitter_name", event.target.value)}
                />
              </label>
              <label>
                Email Address
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={(event) => change("email", event.target.value)}
                />
              </label>
              <label>
                Phone Number
                <input
                  type="tel"
                  required
                  minLength={7}
                  maxLength={32}
                  value={form.phone}
                  onChange={(event) => change("phone", event.target.value)}
                />
              </label>
            </div>
            <label className="itinerary-consent">
              <input
                type="checkbox"
                required
                checked={form.consent}
                onChange={(event) => change("consent", event.target.checked)}
              />
              <span>
                I confirm these details are accurate and allow Chatpate Routes to contact me about
                this itinerary.
              </span>
            </label>
            {fee == null ? (
              <p className="itinerary-fee-unset">
                The submission fee is being set up. You can complete the form, but checkout will be
                available once the fee is configured.
              </p>
            ) : (
              <p className="itinerary-fee-hint">
                Submission fee: <strong>₹{fee.toLocaleString("en-IN")}</strong>. Final order summary
                appears after sign-in.
              </p>
            )}
            {error ? (
              <p className="itinerary-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="itinerary-primary-button itinerary-submit-button"
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? "Submitting…" : isLoading ? "Loading…" : "Continue to Order Summary"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
