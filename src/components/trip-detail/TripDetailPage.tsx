import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import Navbar from "@/components/layout/Navbar";
import "./trip-detail.css";

const sections = [
  ["overview", "Overview"],
  ["itinerary", "Itinerary"],
  ["stay", "Stay"],
  ["included", "Included"],
  ["packing", "What to Bring"],
  ["rules", "Rules"],
  ["faq", "FAQ"],
] as const;

type TripImage = {
  id: string;
  image_url: string;
  is_cover: boolean;
  display_order: number;
};

type TripItinerary = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
};

type BackendTrip = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  destination: string | null;
  trip_type: string | null;
  duration_days: number | null;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  group_size: string | null;
  accommodation: string | null;
  accommodation_description: string | null;
  stay_location: string | null;
  included: string[] | null;
  what_to_bring: string[] | null;
  rules: string[] | null;
  faq:
    | {
        question: string;
        answer: string;
      }[]
    | null;
  cover_image_url: string | null;
  trip_images: TripImage[];
  trip_itinerary: TripItinerary[];
};

function formatDate(date: string | null) {
  if (!date) return "Date to be announced";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(
  startDate: string | null,
  endDate: string | null
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

function formatPrice(price: number | null) {
  if (price == null) return "Price on request";

  return `₹${price.toLocaleString("en-IN")}`;
}

export function TripDetailPage() {
  const { trip } = useSearch({
    from: "/trip-detail",
  });

  const [tripData, setTripData] = useState<BackendTrip | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTrip = async () => {
      if (!trip) {
        setError("No trip selected.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/trips/${trip}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load trip."
          );
        }

        setTripData(result.trip);
      } catch (error) {
        console.error("Failed to load trip:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load trip."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadTrip();
  }, [trip]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          )[0];

        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: 0,
      }
    );

    sections.forEach(([id]) => {
      const el = document.getElementById(id);

      if (el) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [tripData]);

  useEffect(() => {
    const reveals =
      document.querySelectorAll<HTMLElement>(
        ".trip-detail-page .reveal"
      );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
      }
    );

    reveals.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [tripData]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (isLoading) {
    return (
      <div className="trip-detail-page">
        <div className="trip-detail-loading">
          Loading trip...
        </div>
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="trip-detail-page">
        <div className="trip-detail-loading">
          <h2>Unable to load trip</h2>

          <p>{error || "Trip not found."}</p>

          <a href="/trips">
            ← Back to Trips
          </a>
        </div>
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/919266770149?text=${encodeURIComponent(
    `Hi Chatpate Routes, I'm interested in ${tripData.title}.`
  )}`;
  const bookingPath = `/booking?trip=${encodeURIComponent(tripData.id)}`;
  const loginBookingPath = `/login?redirect=${encodeURIComponent(bookingPath)}`;

  const itinerary =
    tripData.trip_itinerary?.length
      ? [...tripData.trip_itinerary].sort(
          (a, b) => a.day_number - b.day_number
        )
      : [];

  const faqs = tripData.faq || [];

  return (
    <div className="trip-detail-page">
      {/* MOBILE BOOKING BAR */}
      <div className="trip-detail-mobile-booking-bar">
        <div className="trip-detail-mobile-booking-info">
          <div className="trip-detail-mobile-booking-name">
            {tripData.title}
          </div>

          <div className="trip-detail-mobile-booking-price">
            From{" "}
            <strong>
              {formatPrice(tripData.price)}
            </strong>{" "}
            / person
          </div>
        </div>

        <a
          className="trip-detail-mobile-book-btn"
          href={loginBookingPath}
        >
          Book Now →
        </a>
      </div>

      <Navbar />

      {/* HERO */}
      <section className="trip-detail-hero">
        <div className="trip-detail-hero-inner reveal">
          <div className="trip-detail-hero-label">
            {tripData.destination || "India"}
            {tripData.trip_type
              ? ` · ${tripData.trip_type}`
              : ""}
          </div>

          <h1 className="trip-detail-hero-title">
            {tripData.title}
          </h1>

          <p className="trip-detail-hero-subtitle">
            {tripData.short_description ||
              tripData.description ||
              "An unforgettable journey with Chatpate Routes."}
          </p>

          <div className="trip-detail-hero-meta">
            <span>
              {formatDateRange(
                tripData.start_date,
                tripData.end_date
              )}
            </span>

            <span className="trip-detail-hero-dot" />

            <span>
              {tripData.duration_days
                ? `${tripData.duration_days} Days`
                : "Duration not specified"}
            </span>

            {tripData.group_size && (
              <>
                <span className="trip-detail-hero-dot" />

                <span>
                  {tripData.group_size}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* MAIN */}
      <main className="trip-detail-main">
        <div className="trip-detail-layout">
          <div className="trip-detail-content">
            {/* SECTION NAV */}
            <nav className="trip-detail-section-nav">
              {sections.map(([id, label]) => (
                <button
                  key={id}
                  className={
                    activeSection === id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    scrollToSection(id)
                  }
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* OVERVIEW */}
            <section
              className="trip-detail-section reveal"
              id="overview"
            >
              <div className="trip-detail-section-kicker">
                The Route
              </div>

              <h2 className="trip-detail-section-title">
                {tripData.title}
              </h2>

              <p className="trip-detail-section-text">
                {tripData.description ||
                  tripData.short_description ||
                  "Explore the destination with Chatpate Routes."}
              </p>

              <div className="trip-detail-highlight-grid">
                <div className="trip-detail-highlight">
                  <div className="trip-detail-highlight-number">
                    01
                  </div>

                  <h4>Destination</h4>

                  <p>
                    {tripData.destination ||
                      "Destination details coming soon."}
                  </p>
                </div>

                <div className="trip-detail-highlight">
                  <div className="trip-detail-highlight-number">
                    02
                  </div>

                  <h4>Trip Type</h4>

                  <p>
                    {tripData.trip_type ||
                      "Travel experience"}
                  </p>
                </div>

                <div className="trip-detail-highlight">
                  <div className="trip-detail-highlight-number">
                    03
                  </div>

                  <h4>Group</h4>

                  <p>
                    {tripData.group_size ||
                      "Small group experience"}
                  </p>
                </div>

                <div className="trip-detail-highlight">
                  <div className="trip-detail-highlight-number">
                    04
                  </div>

                  <h4>Duration</h4>

                  <p>
                    {tripData.duration_days
                      ? `${tripData.duration_days} days`
                      : "Duration to be announced"}
                  </p>
                </div>
              </div>
            </section>

            {/* ITINERARY */}
            <section
              className="trip-detail-section reveal"
              id="itinerary"
            >
              <div className="trip-detail-section-kicker">
                The Plan
              </div>

              <h2 className="trip-detail-section-title">
                The itinerary.
              </h2>

              <div className="trip-detail-itinerary">
                {itinerary.length > 0 ? (
                  itinerary.map((day) => (
                    <div
                      className="trip-detail-itinerary-day"
                      key={day.id}
                    >
                      <div className="trip-detail-day-number">
                        DAY{" "}
                        {String(
                          day.day_number
                        ).padStart(2, "0")}
                      </div>

                      <div className="trip-detail-day-content">
                        <h4>{day.title}</h4>

                        <p>
                          {day.description || ""}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="trip-detail-section-text">
                    Itinerary details will be
                    shared soon.
                  </p>
                )}
              </div>
            </section>

            {/* STAY */}
            <section
              className="trip-detail-section reveal"
              id="stay"
            >
              <div className="trip-detail-section-kicker">
                Good to know
              </div>

              <h2 className="trip-detail-section-title">
                The details.
              </h2>

              <div className="trip-detail-info-list">
                {[
                  [
                    "Duration",
                    tripData.duration_days
                      ? `${tripData.duration_days} Days`
                      : "Not specified",
                  ],
                  [
                    "Destination",
                    tripData.destination ||
                      "Not specified",
                  ],
                  [
                    "Group Size",
                    tripData.group_size ||
                      "Not specified",
                  ],
                  [
                    "Accommodation",
                    tripData.accommodation_description ||
                      tripData.accommodation ||
                      "Not specified",
                  ],
                  [
                    "Stay Location",
                    tripData.stay_location ||
                      "Not specified",
                  ],
                ].map(([label, value]) => (
                  <div
                    className="trip-detail-info-row"
                    key={label}
                  >
                    <div className="trip-detail-info-label">
                      {label}
                    </div>

                    <div className="trip-detail-info-value">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* INCLUDED */}
            <section
              className="trip-detail-section reveal"
              id="included"
            >
              <div className="trip-detail-section-kicker">
                What's covered
              </div>

              <h2 className="trip-detail-section-title">
                Know what you're paying for.
              </h2>

              <div className="trip-detail-include-grid">
                <div>
                  <h4>Included</h4>

                  <ul className="trip-detail-include-list included">
                    {tripData.included?.length ? (
                      tripData.included.map(
                        (item) => (
                          <li key={item}>
                            {item}
                          </li>
                        )
                      )
                    ) : (
                      <li>
                        Details will be updated
                        soon.
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4>Not Included</h4>

                  <ul className="trip-detail-include-list excluded">
                    <li>
                      Personal expenses
                    </li>

                    <li>
                      Meals not mentioned in
                      the itinerary
                    </li>

                    <li>
                      Personal shopping
                    </li>

                    <li>
                      Anything not specifically
                      listed above
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* PACKING */}
            <section
              className="trip-detail-section reveal"
              id="packing"
            >
              <div className="trip-detail-section-kicker">
                Pack smart
              </div>

              <h2 className="trip-detail-section-title">
                What to bring.
              </h2>

              <p className="trip-detail-section-text">
                Keep your luggage practical.
                You'll be moving around and
                spending time outdoors, so
                comfort matters more than
                packing everything you own.
              </p>

              <div className="trip-detail-packing-grid">
                {tripData.what_to_bring?.length ? (
                  tripData.what_to_bring.map(
                    (item) => (
                      <div
                        className="trip-detail-packing-item"
                        key={item}
                      >
                        {item}
                      </div>
                    )
                  )
                ) : (
                  <div className="trip-detail-packing-item">
                    Packing details will be
                    shared soon.
                  </div>
                )}
              </div>
            </section>

            {/* RULES */}
            <section
              className="trip-detail-section reveal"
              id="rules"
            >
              <div className="trip-detail-section-kicker">
                Before you join
              </div>

              <h2 className="trip-detail-section-title">
                A few ground rules.
              </h2>

              <div className="trip-detail-rules">
                <ul>
                  {tripData.rules?.length ? (
                    tripData.rules.map((rule) => (
                      <li key={rule}>
                        {rule}
                      </li>
                    ))
                  ) : (
                    <li>
                      Please follow the
                      instructions provided by
                      the Chatpate Routes team.
                    </li>
                  )}
                </ul>
              </div>
            </section>

            {/* FAQ */}
            <section
              className="trip-detail-section reveal"
              id="faq"
            >
              <div className="trip-detail-section-kicker">
                Questions
              </div>

              <h2 className="trip-detail-section-title">
                Before you book.
              </h2>

              <div className="trip-detail-faq-list">
                {faqs.length > 0 ? (
                  faqs.map((faq, index) => {
                    const isOpen =
                      openFaq === index;

                    return (
                      <div
                        className={`trip-detail-faq-item ${
                          isOpen ? "open" : ""
                        }`}
                        key={`${faq.question}-${index}`}
                      >
                        <button
                          className="trip-detail-faq-question"
                          onClick={() =>
                            setOpenFaq(
                              isOpen
                                ? null
                                : index
                            )
                          }
                          aria-expanded={isOpen}
                        >
                          <span>
                            {faq.question}
                          </span>

                          <span className="trip-detail-faq-icon">
                            +
                          </span>
                        </button>

                        <div
                          className="trip-detail-faq-answer"
                          style={{
                            maxHeight: isOpen
                              ? 300
                              : 0,
                          }}
                        >
                          <p>
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="trip-detail-section-text">
                    No FAQs have been added for
                    this trip yet.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* BOOKING SIDEBAR */}
          <aside className="trip-detail-booking-column">
            <div className="trip-detail-booking-card">
              <div className="trip-detail-booking-body">
                <div className="trip-detail-booking-status">
                  {tripData.capacity
                    ? `${tripData.capacity} spots available`
                    : "Limited spots"}
                </div>

                <h2 className="trip-detail-booking-title">
                  {tripData.title}
                </h2>

                <div className="trip-detail-booking-info">
                  {[
                    [
                      "Dates",
                      formatDateRange(
                        tripData.start_date,
                        tripData.end_date
                      ),
                    ],
                    [
                      "Duration",
                      tripData.duration_days
                        ? `${tripData.duration_days} Days`
                        : "Not specified",
                    ],
                    [
                      "Location",
                      tripData.destination ||
                        "Not specified",
                    ],
                    [
                      "Group",
                      tripData.group_size ||
                        "Small Group",
                    ],
                  ].map(([label, value]) => (
                    <div
                      className="trip-detail-booking-info-row"
                      key={label}
                    >
                      <span className="trip-detail-booking-info-label">
                        {label}
                      </span>

                      <span className="trip-detail-booking-info-value">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="trip-detail-booking-price">
                  <div>
                    <div className="trip-detail-booking-price-label">
                      Starting from
                    </div>

                    <strong>
                      {formatPrice(
                        tripData.price
                      )}
                    </strong>
                  </div>

                  <span className="trip-detail-booking-price-note">
                    per person
                  </span>
                </div>

                <a
                  className="trip-detail-book-btn"
                  href={loginBookingPath}
                >
                  Book Now →
                </a>

                <a
                  className="trip-detail-whatsapp-btn"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Talk to Us on WhatsApp
                </a>

                <div className="trip-detail-trust-points">
                  <div>Secure Booking</div>
                  <div>Real Support</div>
                </div>

                <p className="trip-detail-booking-note">
                  By booking, you agree to the
                  applicable booking,
                  cancellation and refund
                  policies.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
