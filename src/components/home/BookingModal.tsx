import { useEffect, useState, type FormEvent } from "react";
import { useCurrentTripDate } from "@/hooks/use-current-trip-date";

export interface BookingDraft {
  trip?: string;
  travelDate?: string;
}

interface BookingModalProps {
  draft: BookingDraft;
  onClose: () => void;
}

interface EnquiryResponse {
  success?: boolean;
  message?: string;
}

export function BookingModal({ draft, onClose }: BookingModalProps) {
  const today = useCurrentTripDate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    trip: draft.trip ?? "",
    travelDate: draft.travelDate ?? "",
    travellers: "1",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    document.body.classList.add("booking-open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("booking-open");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const update = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const requestMessage = [
        `Trip or destination: ${values.trip.trim()}`,
        `Preferred date: ${values.travelDate || "Flexible"}`,
        `Travellers: ${values.travellers}`,
        values.message.trim() ? `Additional details: ${values.message.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          message: requestMessage,
        }),
      });
      const payload = (await response.json().catch(() => null)) as EnquiryResponse | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message ?? "We could not send your trip request. Please try again.");
      }

      setStatus({
        type: "success",
        message: "Your trip request has been received. We’ll be in touch soon.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "We could not send your trip request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="booking-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="booking-dialog-header">
          <div>
            <p className="booking-dialog-eyebrow">PLAN YOUR NEXT ROUTE</p>
            <h2 id="booking-dialog-title">Tell us where you want to go.</h2>
          </div>
          <button
            type="button"
            className="booking-close"
            aria-label="Close booking form"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="booking-form" onSubmit={onSubmit}>
          <label className="booking-field">
            <span>Name</span>
            <input
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </label>
          <label className="booking-field">
            <span>Email</span>
            <input
              type="email"
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </label>
          <label className="booking-field">
            <span>Phone</span>
            <input
              type="tel"
              value={values.phone}
              onChange={(event) => update("phone", event.target.value)}
              required
            />
          </label>
          <label className="booking-field">
            <span>Travellers</span>
            <input
              type="number"
              min="1"
              value={values.travellers}
              onChange={(event) => update("travellers", event.target.value)}
              required
            />
          </label>
          <label className="booking-field booking-field-full">
            <span>Trip or destination</span>
            <input
              value={values.trip}
              onChange={(event) => update("trip", event.target.value)}
              required
            />
          </label>
          <label className="booking-field">
            <span>
              Preferred date <em>Optional</em>
            </span>
            <input
              type="date"
              min={today}
              value={values.travelDate}
              onChange={(event) => update("travelDate", event.target.value)}
            />
          </label>
          <label className="booking-field booking-field-full">
            <span>
              Anything we should know? <em>Optional</em>
            </span>
            <textarea
              value={values.message}
              onChange={(event) => update("message", event.target.value)}
              rows={3}
            />
          </label>

          {status ? (
            <p
              className={`booking-status ${status.type}`}
              role={status.type === "error" ? "alert" : "status"}
            >
              {status.message}
            </p>
          ) : null}

          <button className="booking-submit" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send Trip Request"}
          </button>
        </form>
      </section>
    </div>
  );
}
