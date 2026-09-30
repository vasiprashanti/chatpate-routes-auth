import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import communityImage from "@/assets/03.jpg";
import tripHero from "@/assets/trip.png";
import { DatePickerField } from "@/components/common/DatePickerField";
import { TripsNav } from "./TripsNav";
import "./trips.css";
import { Link } from "@tanstack/react-router";
import { useCurrentTripDate } from "@/hooks/use-current-trip-date";
import { isPastTrip, isUpcomingTrip } from "@/lib/trip-dates";
import { filterTripsByDateOrMonth } from "@/lib/trip-search";

type Filter = "all" | "upcoming" | "past" | "weekend" | "backpacking" | "popular";
type Month = "all" | "september" | "october" | "november" | "december";

type BackendTrip = {
  id: string;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  destination?: string | null;
  trip_type?: string | null;
  duration_days?: number | null;
  price?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  capacity?: number | null;
  cover_image_url?: string | null;
  status: "draft" | "published" | "archived";
};

type Trip = {
  id: string;
  name: string;
  location: string;
  dates: string;
  duration: string;
  price: string;
  season: string;
  month: Month;
  availability: string;
  image: string;
  alt: string;
  categories: string[];
  search: string;
  href: string;
  startDate: string | null;
  endDate: string | null;
};

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate) return "Dates to be announced";

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  const startText = start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  if (!end) return startText;

  const endText = end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return `${startText}–${endText}`;
}

function getMonth(date?: string | null): Month {
  if (!date) return "all";

  const month = new Date(date).getMonth();

  const monthMap: Record<number, Month> = {
    8: "september",
    9: "october",
    10: "november",
    11: "december",
  };

  return monthMap[month] ?? "all";
}

function formatPrice(price?: number | null) {
  if (price == null) return "Price on request";

  return `₹${price.toLocaleString("en-IN")}`;
}

function backendTripToTrip(trip: BackendTrip): Trip {
  const month = getMonth(trip.start_date);

  return {
    id: trip.id,
    name: trip.title,
    location: trip.destination || "India",
    dates: formatDateRange(trip.start_date, trip.end_date),
    duration: trip.duration_days
      ? `${trip.duration_days} Day${trip.duration_days === 1 ? "" : "s"}`
      : "Flexible",
    price: formatPrice(trip.price),
    season: month === "all" ? "UPCOMING" : month.toUpperCase(),
    month,
    availability: trip.capacity
      ? `${trip.capacity} SPOTS`
      : "",
    image: trip.cover_image_url || tripHero,
    alt: trip.title,
    categories: trip.trip_type ? [trip.trip_type.toLowerCase()] : [],
    search: `${trip.title} ${trip.destination || ""}`.toLowerCase(),
    href: `/trips/${trip.slug}`,
    startDate: trip.start_date ?? null,
    endDate: trip.end_date ?? null,
  };
}

const filterOptions: { value: Filter; label: string }[] = [
  { value: "all", label: "All Trips" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past Trips" },
  { value: "weekend", label: "Weekend" },
  { value: "backpacking", label: "Backpacking" },
  { value: "popular", label: "Popular" },
];

const monthOptions: { value: Month; label: string }[] = [
  { value: "all", label: "All Months" },
  { value: "september", label: "September 2026" },
  { value: "october", label: "October 2026" },
  { value: "november", label: "November 2026" },
  { value: "december", label: "December 2026" },
];

function TripCard({ trip, index }: { trip: Trip; index: number }) {
  return (
    <article className="trips-trip-card trips-reveal-visible" style={{ transitionDelay: `${index * 60}ms` }}>
      <Link to="/trip-detail" search={{ trip: trip.id }} className="trips-trip-link">
        <div className="trips-trip-image">
          <img src={trip.image} alt={trip.alt} />
          <div className="trips-trip-season">{trip.season}</div>
          {trip.availability ? (
            <div className="trips-trip-availability">{trip.availability}</div>
          ) : null}
        </div>
        <div className="trips-trip-info">
          <h3>{trip.name}</h3>
          <div className="trips-trip-location">{trip.location}</div>
          <div className="trips-trip-meta">
            <div className="trips-trip-meta-top">
              <div className="trips-meta-item">
                <span>Dates</span>
                <strong>{trip.dates}</strong>
              </div>
              <div className="trips-meta-item trips-route-item">
                <span>Duration</span>
                <strong>{trip.duration}</strong>
              </div>
            </div>
          </div>
        </div>
      </Link>
      <div className="trips-trip-actions">
        <div className="trips-trip-bottom">
          <Link to="/trip-detail" search={{ trip: trip.id }} className="trips-view-details">
            Explore Trip
          </Link>
          <div className="trips-trip-price">
            <span>Starting from</span>
            <strong>{trip.price}</strong>
          </div>
        </div>
        <a className="trips-card-book-btn" href={`/booking?trip=${encodeURIComponent(trip.id)}`}>
          Book Now <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

export function TripsPage() {
  const today = useCurrentTripDate();
    const { month: urlMonth, date: urlDate, q: urlQuery } = useSearch({from: "/trips",});
    const navigate = useNavigate({ from: "/trips" });
    const [selectedDate, setSelectedDate] = useState(urlDate);
    const [search, setSearch] = useState(urlQuery);
    const [filter, setFilter] = useState<Filter>("all");
    const [month, setMonth] = useState<Month>(() => {
      return urlMonth === "september" ||
        urlMonth === "october" ||
        urlMonth === "november" ||
        urlMonth === "december"
        ? urlMonth
        : "all";
    });
  const [monthOpen, setMonthOpen] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => setSelectedDate(urlDate), [urlDate]);
  useEffect(() => setSearch(urlQuery), [urlQuery]);
  useEffect(() => {
    setMonth(
      urlMonth === "september" ||
        urlMonth === "october" ||
        urlMonth === "november" ||
        urlMonth === "december"
        ? urlMonth
        : "all",
    );
  }, [urlMonth]);


  useEffect(() => {
  const loadTrips = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/trips");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load trips.");
      }

      const backendTrips: BackendTrip[] = result.trips || [];

      setTrips(backendTrips.map(backendTripToTrip));
    } catch (error) {
      console.error("Failed to load trips:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load trips.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  loadTrips();
}, []);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) {
        setMonthOpen(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, []);

  const { trips: visibleTrips, usedMonthFallback } = useMemo(() => {
    const query = search.trim().toLowerCase();
    const tripsMatchingOtherFilters = trips.filter((trip) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "upcoming"
            ? isUpcomingTrip(trip.startDate, trip.endDate, today)
            : filter === "past"
              ? isPastTrip(trip.endDate, today)
              : trip.categories.includes(filter);

      // A selected date determines its own month; don't let a stale month
      // filter hide the exact-date or same-month fallback results.
      const matchesMonth =
        Boolean(selectedDate) || month === "all" || trip.month === month;
      const matchesSearch = !query || trip.search.toLowerCase().includes(query);

      return matchesFilter && matchesMonth && matchesSearch;
    });

    return filterTripsByDateOrMonth(tripsMatchingOtherFilters, selectedDate, today);
  }, [trips, search, filter, month, selectedDate, today]);

  const clearFilters = () => {
  setSearch("");
  setFilter("all");
  setMonth("all");
  setSelectedDate("");
  setMonthOpen(false);
  void navigate({
    search: { month: "", date: "", q: "" },
    replace: true,
  });
};

  const selectedMonthLabel = monthOptions.find((option) => option.value === month)?.label ?? "All Months";

  return (
    <div className="trips-page">
      <TripsNav />

      <section className="trips-hero" style={{ backgroundImage: `url(${tripHero})`, backgroundPosition: "center 50%",}}>
        <div className="trips-hero-inner trips-reveal-visible">
          <div className="trips-hero-eyebrow">Curated escapes · Real experiences</div>
          <h1>Find your next escape.</h1>
          <p>
            Offbeat places, unexpected stories and good people. Pick a trip and come make some memories with us.
          </p>
        </div>
      </section>

      <main className="trips-main">
        <div className="trips-container">
          <div className="trips-search-wrapper">
            <span className="trips-search-icon">⌕</span>
            <input
              type="text"
              value={search}
              onChange={(event) => {
                const nextSearch = event.target.value;
                setSearch(nextSearch);
                void navigate({
                  search: (previous) => ({ ...previous, q: nextSearch }),
                  replace: true,
                });
              }}
              placeholder="Search destinations or trips..."
              autoComplete="off"
              aria-label="Search destinations or trips"
            />
          </div>

          <div className="trips-filters">
            <DatePickerField
              id="trips-travel-date"
              label="Filter by travel date"
              value={selectedDate}
              className="date-picker-field--compact"
              onChange={(nextDate) => {
                setSelectedDate(nextDate);
                setMonth("all");
                void navigate({
                  search: (previous) => ({ ...previous, month: "", date: nextDate }),
                  replace: true,
                });
              }}
            />

            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`trips-filter-btn${filter === option.value ? " active" : ""}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}

            <div className={`trips-month-picker${monthOpen ? " open" : ""}`} ref={monthRef}>
              <button
                type="button"
                className="trips-month-picker-btn"
                aria-expanded={monthOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setMonthOpen((open) => !open);
                }}
              >
                <span className="trips-month-picker-icon">◷</span>
                <span>{selectedMonthLabel}</span>
                <span className="trips-month-picker-arrow">↓</span>
              </button>

              <div className="trips-month-dropdown">
                <div className="trips-month-dropdown-title">Travel month</div>
                {monthOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`trips-month-option${month === option.value ? " active" : ""}`}
                  onClick={() => {
                    setMonth(option.value);
                    setMonthOpen(false);
                    setSelectedDate("");
                    void navigate({
                      search: (previous) => ({
                        ...previous,
                        month: option.value === "all" ? "" : option.value,
                        date: "",
                      }),
                      replace: true,
                    });
                  }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="trips-empty-state">
              <h3>Loading trips...</h3>
              <p>Finding the latest escapes for you.</p>
            </div>
          ) : error ? (
            <div className="trips-empty-state">
              <h3>Unable to load trips.</h3>
              <p>{error}</p>
            </div>
          ) : (
            <>
            {usedMonthFallback && selectedDate && visibleTrips.length > 0 ? (
              <p className="trips-date-fallback-note" role="status">
                No trips include{" "}
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                . Showing available trips for{" "}
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                instead.
              </p>
            ) : null}
            <div className="trips-trip-grid">
              {visibleTrips.map((trip, index) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  index={index}
                />
              ))}
            </div>
            </>
          )}

          {!isLoading && !error && visibleTrips.length === 0 && (
            <div className="trips-empty-state">
              <h3>
                {usedMonthFallback
                  ? "No available trips in that month."
                  : filter === "upcoming"
                    ? "No upcoming trips found."
                    : filter === "past"
                      ? "No past trips found."
                      : "No trips found."}
              </h3>
              <p>Try another destination or clear your filters.</p>
              <button type="button" onClick={clearFilters}>Clear Filters</button>
            </div>
          )}

          <section
            className="trips-community-cta"
            style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.2)), url(${communityImage})` }}
          >
            <div className="trips-community-content">
              <div className="trips-community-label">More than a trip</div>
              <h2>Come for the place. Stay for the people.</h2>
              <p>
                Chatpate Routes is built around people who want to explore somewhere different, meet strangers, and come back with stories worth telling.
              </p>
              <a className="trips-whatsapp-btn" href="https://wa.me/919266770149" target="_blank" rel="noopener noreferrer">
                Talk on WhatsApp →
              </a>
            </div>
          </section>
        </div>
      </main>

      <footer className="trips-site-footer">
        <div className="trips-footer-inner">
          <div className="trips-footer-brand">
            <h2>Chatpate<br />Routes.</h2>
            <p>Boring Travel is<br />just not our vibe.</p>
          </div>
          <div className="trips-footer-links">
            <div className="trips-footer-link-group">
              <span>Explore</span>
              <a href="/trips">Trips</a>
              <a href="/#community">Community</a>
              <a href="/#meetups">Meetups</a>
              <a href="/#about">About</a>
            </div>
            <div className="trips-footer-link-group">
              <span>Connect</span>
              <a href="https://www.instagram.com/chatpate.routes.in/?hl=en" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://wa.me/919266770149" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
            <div className="trips-footer-link-group">
              <span>Legal</span>
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/terms">Terms &amp; Conditions</a>
              <a href="/terms#cancellation">Returns & Refunds</a>
            </div>
          </div>
        </div>
        <div className="trips-footer-bottom">
          <span>© 2026 Chatpate Routes</span>
          <span>Made with ❤️ by <a href="https://techlearnsolutions.com/" target="_blank" rel="noopener noreferrer">TechLearn Solutions</a></span>
        </div>
      </footer>
    </div>
  );
}
