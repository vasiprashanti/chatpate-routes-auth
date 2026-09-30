import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, FileText, X } from "lucide-react";
import { supabase } from "@/integerations/supabase/client";
import "../admin-operations.css";
import "./admin-itineraries.css";

type ReviewStatus = "pending_review" | "under_review" | "approved" | "rejected";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type CreatorTag = "explorer" | "trip_creator" | "co_host";
type Submission = {
  id: string;
  user_id: string;
  submission_method: "manual" | "pdf";
  title: string;
  destination: string;
  starting_location: string | null;
  travel_months: string[];
  duration: string;
  estimated_budget: number | null;
  itinerary_details: string | null;
  additional_notes: string | null;
  pdf_path: string | null;
  signed_pdf_url: string | null;
  cohost_interest: "yes" | "no" | "maybe";
  submitter_name: string;
  email: string;
  phone: string;
  consent: boolean;
  review_status: ReviewStatus;
  payment_status: PaymentStatus;
  fee_amount: number;
  creator_tag: CreatorTag;
  created_at: string;
};

const reviewOptions: ReviewStatus[] = ["pending_review", "under_review", "approved", "rejected"];
const paymentOptions: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];
const tagOptions: CreatorTag[] = ["explorer", "trip_creator", "co_host"];
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const accessToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

export default function AdminItinerariesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [fee, setFee] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = await accessToken();
      if (!token) throw new Error("Administrator session is required.");
      const response = await fetch("/api/admin/itinerary-submissions", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        submissions?: Submission[];
        fee?: number | null;
      };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not load submissions.");
      setSubmissions(result.submissions ?? []);
      setFee(result.fee == null ? "" : String(result.fee));
      setSelected((current) =>
        current
          ? ((result.submissions ?? []).find((item) => item.id === current.id) ?? null)
          : null,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return submissions;
    return submissions.filter((item) =>
      `${item.title} ${item.destination} ${item.submitter_name} ${item.email}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [submissions, search]);

  const patchSubmission = async (
    item: Submission,
    changes: Partial<Pick<Submission, "review_status" | "payment_status" | "creator_tag">>,
  ) => {
    setUpdatingId(item.id);
    setError("");
    try {
      const token = await accessToken();
      if (!token) throw new Error("Administrator session is required.");
      const response = await fetch(
        `/api/admin/itinerary-submissions/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        },
      );
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not update submission.");
      setNotice("Submission updated.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update submission.");
    } finally {
      setUpdatingId(null);
    }
  };

  const saveFee = async () => {
    const value = Number(fee);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Set a submission fee greater than ₹0.");
      return;
    }
    setSavingFee(true);
    setError("");
    try {
      const token = await accessToken();
      if (!token) throw new Error("Administrator session is required.");
      const response = await fetch("/api/admin/itinerary-submission-settings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ submission_fee: value }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        setting?: { submission_fee: number };
      };
      if (!response.ok || !result.success)
        throw new Error(result.message || "Could not save the fee.");
      setFee(String(result.setting?.submission_fee ?? value));
      setNotice("Submission fee saved. New checkout summaries will use this amount.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save fee.");
    } finally {
      setSavingFee(false);
    }
  };

  const createTripDraft = (item: Submission) => {
    if (item.submission_method !== "manual") return;
    sessionStorage.setItem("chatpate-itinerary-trip-draft", JSON.stringify(item));
    window.location.assign("/admin/trips/new");
  };

  const stats = [
    { label: "Total Submissions", value: submissions.length },
    {
      label: "Pending Review",
      value: submissions.filter((item) => item.review_status === "pending_review").length,
    },
    {
      label: "Pending Payment",
      value: submissions.filter((item) => item.payment_status === "pending").length,
    },
    { label: "Paid", value: submissions.filter((item) => item.payment_status === "paid").length },
  ];

  return (
    <main className="admin-operations-page admin-itineraries-page">
      <div className="admin-operations-container">
        <header className="admin-operations-heading">
          <div>
            <p className="admin-operations-eyebrow">Admin / Itinerary Submissions</p>
            <h1>Itinerary Submissions</h1>
            <p>
              Review routes shared by the community and manage their payment and creator status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="admin-operations-secondary"
          >
            Refresh
          </button>
        </header>
        <section className="admin-operations-stats" aria-label="Submission statistics">
          {stats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{isLoading ? "—" : stat.value}</strong>
            </article>
          ))}
        </section>
        <section className="admin-itinerary-fee">
          <div>
            <span>Itinerary submission fee</span>
            <small>
              Used for new orders only; existing submissions keep their recorded amount.
            </small>
          </div>
          <label>
            <span className="sr-only">Submission fee in rupees</span>
            <span aria-hidden="true">₹</span>
            <input
              type="number"
              min="1"
              step="1"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
              placeholder="Set fee"
            />
          </label>
          <button type="button" onClick={() => void saveFee()} disabled={savingFee}>
            {savingFee ? "Saving…" : "Save fee"}
          </button>
        </section>
        {error ? (
          <p className="admin-operations-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="admin-itinerary-notice" role="status">
            {notice}
          </p>
        ) : null}
        <section className="admin-operations-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, submitter or destination…"
            aria-label="Search itinerary submissions"
          />
        </section>
        <section className="admin-operations-table-card">
          <div className="admin-operations-table-title">
            <h2>All Submissions</h2>
            <span>{filtered.length} submissions</span>
          </div>
          <div className="admin-operations-table-scroll">
            <table className="admin-operations-table admin-itinerary-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Submitter</th>
                  <th>Submitted</th>
                  <th>Destination</th>
                  <th>Duration</th>
                  <th>Payment</th>
                  <th>Creator Tag</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setSelected(item);
                    }}
                  >
                    <td>
                      <strong>{item.title}</strong>
                      <small>
                        {item.submission_method === "pdf" ? "PDF upload" : "Manual entry"}
                      </small>
                    </td>
                    <td>
                      <strong>{item.submitter_name}</strong>
                      <small>{item.email}</small>
                    </td>
                    <td>
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>{item.destination}</td>
                    <td>{item.duration}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <select
                        aria-label={`Payment status for ${item.title}`}
                        disabled={updatingId === item.id}
                        value={item.payment_status}
                        onChange={(event) =>
                          void patchSubmission(item, {
                            payment_status: event.target.value as PaymentStatus,
                          })
                        }
                      >
                        {paymentOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <select
                        aria-label={`Creator tag for ${item.title}`}
                        disabled={updatingId === item.id}
                        value={item.creator_tag}
                        onChange={(event) =>
                          void patchSubmission(item, {
                            creator_tag: event.target.value as CreatorTag,
                          })
                        }
                      >
                        {tagOptions.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="admin-itinerary-view"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(item);
                        }}
                        aria-label={`View ${item.title}`}
                        title="View submission"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && !filtered.length ? (
                  <tr>
                    <td colSpan={8} className="admin-operations-empty">
                      No itinerary submissions yet.
                    </td>
                  </tr>
                ) : null}
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="admin-operations-empty">
                      Loading submissions…
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {selected ? (
        <div
          className="admin-itinerary-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="admin-itinerary-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-itinerary-title"
          >
            <header>
              <div>
                <p className="admin-operations-eyebrow">Submission details</p>
                <h2 id="admin-itinerary-title">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <div className="admin-itinerary-detail-grid">
              <div>
                <span>Submitter</span>
                <strong>{selected.submitter_name}</strong>
                <small>{selected.email}</small>
              </div>
              <div>
                <span>Phone</span>
                <strong>{selected.phone}</strong>
              </div>
              <div>
                <span>Destination / Route</span>
                <strong>{selected.destination}</strong>
              </div>
              <div>
                <span>Starting Location</span>
                <strong>{selected.starting_location || "—"}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{selected.duration}</strong>
              </div>
              <div>
                <span>Travel Months</span>
                <strong>{selected.travel_months.join(", ")}</strong>
              </div>
              <div>
                <span>Estimated Budget / Person</span>
                <strong>
                  {selected.estimated_budget == null
                    ? "—"
                    : `₹${selected.estimated_budget.toLocaleString("en-IN")}`}
                </strong>
              </div>
              <div>
                <span>Submission Fee</span>
                <strong>₹{selected.fee_amount.toLocaleString("en-IN")}</strong>
              </div>
              <div>
                <span>Co-hosting Interest</span>
                <strong>{label(selected.cohost_interest)}</strong>
              </div>
              <div>
                <span>Submitted</span>
                <strong>{new Date(selected.created_at).toLocaleString("en-IN")}</strong>
              </div>
            </div>
            {selected.itinerary_details ? (
              <section className="admin-itinerary-text">
                <h3>Itinerary Details</h3>
                <p>{selected.itinerary_details}</p>
              </section>
            ) : null}
            {selected.additional_notes ? (
              <section className="admin-itinerary-text">
                <h3>Additional Notes</h3>
                <p>{selected.additional_notes}</p>
              </section>
            ) : null}
            {selected.pdf_path ? (
              <a
                className="admin-itinerary-pdf"
                href={selected.signed_pdf_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!selected.signed_pdf_url}
              >
                <FileText size={18} />
                {selected.pdf_path.split("/").pop()} <ArrowRight size={15} />
              </a>
            ) : null}
            <div className="admin-itinerary-selects">
              <label>
                Review status
                <select
                  value={selected.review_status}
                  disabled={updatingId === selected.id}
                  onChange={(event) =>
                    void patchSubmission(selected, {
                      review_status: event.target.value as ReviewStatus,
                    })
                  }
                >
                  {reviewOptions.map((option) => (
                    <option key={option} value={option}>
                      {label(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Payment status
                <select
                  value={selected.payment_status}
                  disabled={updatingId === selected.id}
                  onChange={(event) =>
                    void patchSubmission(selected, {
                      payment_status: event.target.value as PaymentStatus,
                    })
                  }
                >
                  {paymentOptions.map((option) => (
                    <option key={option} value={option}>
                      {label(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Creator tag
                <select
                  value={selected.creator_tag}
                  disabled={updatingId === selected.id}
                  onChange={(event) =>
                    void patchSubmission(selected, {
                      creator_tag: event.target.value as CreatorTag,
                    })
                  }
                >
                  {tagOptions.map((option) => (
                    <option key={option} value={option}>
                      {label(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selected.submission_method === "manual" ? (
              <button
                className="admin-itinerary-create-trip"
                type="button"
                onClick={() => createTripDraft(selected)}
              >
                Create Trip Draft <ArrowRight size={16} />
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
