import { FormEvent, useEffect, useState } from "react";
import "./booking.css";
import QRCode from "../common/QRCode";
import { supabase } from "@/integerations/supabase/client";

const WHATSAPP_NUMBER = "919266770149";

type BackendTrip = {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  destination: string | null;
  capacity: number | null;
  cover_image_url: string | null;
};

function formatPrice(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function formatDate(date: string | null) {
  if (!date) return "Dates to be announced";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(
  startDate: string | null,
  endDate: string | null,
) {
  if (!startDate || !endDate) {
    return "Dates to be announced";
  }

  const start = new Date(startDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const end = new Date(endDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${start} – ${end}`;
}

function getAvailability(
  capacity: number | null,
) {
  if (capacity == null) {
    return "Limited spots";
  }

  return `${capacity} spots available`;
}

function TripSummary({
  trip,
  totalAmount,
  breakdown,
}: {
  trip: BackendTrip;
  totalAmount: number;
  breakdown: string;
}) {
  return (
    <div className="summary-card">
      <div className="summary-image">
        {trip.cover_image_url ? (
          <img src={trip.cover_image_url} alt={trip.title} />
        ) : (
          <div className="summary-image-empty">No trip image</div>
        )}
      </div>

      <div className="summary-body">
        <div className="summary-label">Your Trip</div>
        <h2 className="summary-title">{trip.title}</h2>

        <div className="summary-info">
          <div className="summary-row">
            <span className="summary-key">Dates</span>
            <span className="summary-value">
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Duration</span>
            <span className="summary-value">
              {trip.duration_days ? `${trip.duration_days} Days` : "Not specified"}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Location</span>
            <span className="summary-value">
              {trip.destination || "Not specified"}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Availability</span>
            <span className="summary-value">
              {getAvailability(trip.capacity)}
            </span>
          </div>
        </div>

        <div className="summary-price">
          <div>
            <div className="summary-price-label">Total</div>
            <div className="summary-price-value">
              {formatPrice(totalAmount)}
            </div>
            <div className="summary-calculation">{breakdown}</div>
          </div>
        </div>

        <div className="summary-trust">
          <div className="trust-item">Secure Booking</div>
          <div className="trust-item">WhatsApp Support</div>
        </div>
      </div>
    </div>
  );
}

export function BookingPage() {
  const [tripId, setTripId] = useState("");

  const [trip, setTrip] =
    useState<BackendTrip | null>(null);

  const [tripLoading, setTripLoading] =
    useState(true);

  const [tripError, setTripError] =
    useState("");

  const [authChecked, setAuthChecked] = useState(false);

  const [travellers, setTravellers] =
    useState("1");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [travellerNames, setTravellerNames] =
    useState("");

  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [whatsappURL, setWhatsappURL] =
    useState("#");

  const [bookingID, setBookingID] =
    useState("");


  useEffect(() => {
    let active = true;

    const checkAuthentication = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.access_token) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.replace(
          `/login?redirect=${encodeURIComponent(redirect)}`,
        );
        return;
      }

      setAuthChecked(true);
    };

    checkAuthentication();

    return () => {
      active = false;
    };
  }, []);

  /*
   * Load the selected trip from the backend.
   *
   * Trip Detail sends:
   * /booking?trip=<backend-trip-id>
   */
  useEffect(() => {
    const loadTrip = async () => {
      const params = new URLSearchParams(
        window.location.search,
      );

      const selectedTrip =
        params.get("trip");

      if (!selectedTrip) {
        setTripError("No trip selected.");
        setTripLoading(false);
        return;
      }

      try {
        setTripLoading(true);
        setTripError("");
        setTripId(selectedTrip);

        const response = await fetch(
          `/api/trips/${encodeURIComponent(
            selectedTrip,
          )}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load trip.",
          );
        }

        setTrip(result.trip);
      } catch (error) {
        console.error(
          "Failed to load booking trip:",
          error,
        );

        setTripError(
          error instanceof Error
            ? error.message
            : "Failed to load trip.",
        );
      } finally {
        setTripLoading(false);
      }
    };

    loadTrip();
  }, []);

  const travellerCount =
    Number(travellers) || 1;

  const totalAmount =
    trip?.price != null
      ? trip.price * travellerCount
      : 0;

  const advanceAmount =
    Math.round(totalAmount * 0.6);

  const breakdown =
    trip?.price != null
      ? `${formatPrice(trip.price)} × ${travellerCount} ${
          travellerCount === 1
            ? "traveller"
            : "travellers"
        }`
      : "Price unavailable";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!trip) {
      window.alert(
        "Trip information is not available.",
      );
      return;
    }

    if (
      !name.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !travellers
    ) {
      window.alert(
        "Please fill in all required details.",
      );
      return;
    }

    if (!tripId) {
      window.alert(
        "No trip was selected.",
      );
      return;
    }

    if (!trip.start_date) {
      window.alert(
        "This trip does not have a travel date yet.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.replace(
          `/login?redirect=${encodeURIComponent(redirect)}`,
        );
        return;
      }

      /*
       * The backend generates the booking ID if one
       * isn't supplied, so we don't need to generate
       * one on the frontend.
       */
      const response = await fetch(
        "/api/booking",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            trip: tripId,
            travelDate: trip.start_date,
            travellers: travellerCount,
            message: [
              travellerNames.trim()
                ? `Traveller names: ${travellerNames.trim()}`
                : "",
              message.trim(),
            ]
              .filter(Boolean)
              .join("\n\n"),
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to submit booking.",
        );
      }

      const returnedBookingId =
        result.bookingId || "";

      if (!returnedBookingId) {
        throw new Error("Booking was created but no booking ID was returned.");
      }

      setBookingID(returnedBookingId);

      const whatsappMessage = `Hi Chatpate Routes!

I'd like to confirm my booking.

Booking ID: ${
        returnedBookingId || "Pending"
      }

Trip: ${trip.title}
Dates: ${formatDateRange(
        trip.start_date,
        trip.end_date,
      )}
Travellers: ${travellerCount}

Name: ${name.trim()}
WhatsApp: ${phone.trim()}
Email: ${email.trim()}

Price per person: ${
        trip.price != null
          ? formatPrice(trip.price)
          : "Price on request"
      }
Total Amount: ${formatPrice(totalAmount)}
Advance Paid: ${formatPrice(
        advanceAmount,
      )}

Traveller Names:
${
  travellerNames.trim() ||
  "Same as above"
}

Notes:
${message.trim() || "None"}

I will share my payment details and screenshot with you on WhatsApp.`;

      const url =
        `https://wa.me/${WHATSAPP_NUMBER}` +
        `?text=${encodeURIComponent(
          whatsappMessage,
        )}`;

      setWhatsappURL(url);

      setSubmitted(true);
    } catch (error) {
      console.error(
        "Booking submission error:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while submitting your booking. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * Loading state
   */
  if (!authChecked || tripLoading) {
    return (
      <div className="booking-page-react">
        <nav className="navbar">
          <a
            href="/"
            className="nav-brand"
          >
            Chatpate Routes
          </a>

          <a
            href="/trips"
            className="nav-back"
          >
            ← Back to Trips
          </a>
        </nav>

        <main className="booking-page">
          <div className="booking-container">
            <section className="booking-main">
              <div className="booking-success active">
                <h2>Loading trip...</h2>

                <p>
                  We're getting the trip
                  details for you.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  /*
   * Trip loading error
   */
  if (tripError || !trip) {
    return (
      <div className="booking-page-react">
        <nav className="navbar">
          <a
            href="/"
            className="nav-brand"
          >
            Chatpate Routes
          </a>

          <a
            href="/trips"
            className="nav-back"
          >
            ← Back to Trips
          </a>
        </nav>

        <main className="booking-page">
          <div className="booking-container">
            <section className="booking-main">
              <div className="booking-success active">
                <h2>
                  Unable to load trip
                </h2>

                <p>
                  {tripError ||
                    "Trip not found."}
                </p>

                <a href="/trips">
                  ← Back to Trips
                </a>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="booking-page-react">
      <nav className="navbar">
        <a
          href="/"
          className="nav-brand"
        >
          Chatpate Routes
        </a>

        <a
          href="/trips"
          className="nav-back"
        >
          ← Back to Trips
        </a>
      </nav>

      <main className="booking-page">
        <div className="booking-container">
          <section className="booking-main">
            <div className="page-kicker">
              Complete Your Booking
            </div>

            <h1 className="page-title">
              Let's make
              <br />
              this trip happen.
            </h1>

            <p className="page-intro">
              Fill in your details and confirm
              your booking with us on WhatsApp.
            </p>

            <aside className="booking-summary booking-summary-mobile">
              <TripSummary
                trip={trip}
                totalAmount={totalAmount}
                breakdown={breakdown}
              />
            </aside>

            {!submitted ? (
              <form
                className="booking-form-card"
                onSubmit={handleSubmit}
              >
                {/* ========================= */}
                {/* TRAVELLER DETAILS */}
                {/* ========================= */}

                <div className="form-section">
                  <h2 className="form-section-title">
                    Traveller Details
                  </h2>

                  <div className="form-grid">
                    <div className="form-group">
                      <label
                        className="form-label"
                        htmlFor="name"
                      >
                        Full Name
                      </label>

                      <input
                        className="form-input"
                        id="name"
                        type="text"
                        placeholder="Your full name"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(e) =>
                          setName(
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label
                        className="form-label"
                        htmlFor="phone"
                      >
                        WhatsApp
                      </label>

                      <input
                        className="form-input"
                        id="phone"
                        type="tel"
                        placeholder="Your WhatsApp number"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(e) =>
                          setPhone(
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label
                        className="form-label"
                        htmlFor="email"
                      >
                        Email
                      </label>

                      <input
                        className="form-input"
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) =>
                          setEmail(
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label
                        className="form-label"
                        htmlFor="travellers"
                      >
                        Travellers
                      </label>

                      <select
                        id="travellers"
                        className="form-select"
                        required
                        value={travellers}
                        onChange={(e) =>
                          setTravellers(
                            e.target.value,
                          )
                        }
                      >
                        <option value="">
                          Select
                        </option>

                        <option value="1">
                          1 Traveller
                        </option>

                        <option value="2">
                          2 Travellers
                        </option>

                        <option value="3">
                          3 Travellers
                        </option>

                        <option value="4">
                          4 Travellers
                        </option>

                        <option value="5">
                          5 Travellers
                        </option>
                      </select>
                    </div>

                    <div className="form-group full">
                      <label
                        className="form-label"
                        htmlFor="travellerNames"
                      >
                        Traveller Names
                      </label>

                      <textarea
                        id="travellerNames"
                        className="form-textarea"
                        placeholder="Enter the full names of all travellers"
                        value={
                          travellerNames
                        }
                        onChange={(e) =>
                          setTravellerNames(
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="form-group full">
                      <label
                        className="form-label"
                        htmlFor="message"
                      >
                        Anything we should
                        know?
                      </label>

                      <textarea
                        id="message"
                        className="form-textarea"
                        placeholder="Dietary requirements, questions, special requests..."
                        value={message}
                        onChange={(e) =>
                          setMessage(
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* ========================= */}
                {/* COMPLETE PAYMENT */}
                {/* ========================= */}

                <div className="form-section">
                  <h2 className="form-section-title">
                    Complete Payment
                  </h2>

                  <div className="payment-box">
                    <h3 className="payment-title">
                      Scan & Pay
                    </h3>

                    <p className="payment-description">
                      Scan the QR code using
                      your preferred UPI app
                      and pay the 60% advance
                      amount shown below.
                    </p>

                    <div className="payment-content">
                      <div className="qr-wrapper">
                        <QRCode />
                      </div>

                      <div className="payment-details">
                        <div className="payment-amount-label">
                          Advance to Pay
                        </div>

                        <div className="payment-amount">
                          {formatPrice(
                            advanceAmount,
                          )}
                        </div>

                        <div className="payment-breakdown">
                          60% of{" "}
                          {formatPrice(
                            totalAmount,
                          )}
                        </div>

                        <p className="payment-note">
                          Payment details and any
                          screenshot can be shared
                          with our team on WhatsApp
                          after you submit.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ========================= */}
                {/* SUBMIT */}
                {/* ========================= */}

                <div className="submit-section">
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Submitting Booking..."
                      : "Submit Booking →"}
                  </button>

                  <p className="submit-note">
                    Your booking will be saved and
                    you can share payment details on
                    WhatsApp.
                  </p>
                </div>
              </form>
            ) : (
              /* ========================= */
              /* SUCCESS SCREEN */
              /* ========================= */

              <div className="booking-success active">
                <div className="success-icon">
                  ✓
                </div>

                <h2>Almost there.</h2>

                <p>
                  Your booking details have been
                  submitted successfully. Continue
                  on WhatsApp to share payment details
                  and complete confirmation.
                </p>

                {bookingID && (
                  <p>
                    <strong>
                      Booking ID:
                    </strong>{" "}
                    {bookingID}
                  </p>
                )}

                <a
                  href={whatsappURL}
                  className="whatsapp-success-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continue on WhatsApp →
                </a>
              </div>
            )}
          </section>

          {/* ========================= */}
          {/* TRIP SUMMARY */}
          {/* ========================= */}

          <aside className="booking-summary booking-summary-desktop">
            <TripSummary
              trip={trip}
              totalAmount={totalAmount}
              breakdown={breakdown}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
