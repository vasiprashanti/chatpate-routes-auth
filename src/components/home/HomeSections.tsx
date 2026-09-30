import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { CalendarDays } from "lucide-react";
import { DatePickerField } from "@/components/common/DatePickerField";
import { homeImages } from "./images";

type BackendTrip = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  price: number;
  cover_image_url?: string | null;
};

export function HeroSection({
  onFindTrip,
}: {
  onFindTrip: (destination: string, travelDate: string, selectedTrip?: BackendTrip) => void;
}) {
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const [selectedTrip, setSelectedTrip] = useState<BackendTrip | null>(null);

  const [backendTrips, setBackendTrips] = useState<BackendTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const response = await fetch("/api/trips");

        if (!response.ok) {
          throw new Error("Failed to fetch trips");
        }

        const result = await response.json();

        if (result.success && Array.isArray(result.trips)) {
          setBackendTrips(result.trips);
        }
      } catch (error) {
        console.error("Failed to load trips:", error);
      } finally {
        setTripsLoading(false);
      }
    };

    loadTrips();
  }, []);

  const suggestions = useMemo(() => {
    const query = destination.trim().toLowerCase();

    if (!query) return [];

    return backendTrips.filter((trip) => {
      const matchesDestination = `${trip.title} ${trip.destination}`.toLowerCase().includes(query);
      const startDate = trip.start_date?.slice(0, 10) ?? "";
      const endDate = trip.end_date?.slice(0, 10) || startDate;
      const matchesDate =
        !travelDate ||
        Boolean(startDate && endDate && travelDate >= startDate && travelDate <= endDate);

      return matchesDestination && matchesDate;
    });
  }, [destination, backendTrips, travelDate]);

  const selectSuggestion = (trip: BackendTrip) => {
    setDestination(trip.title);
    setSelectedTrip(trip);
    setSuggestionsOpen(false);
    setHighlightedSuggestion(-1);
  };
  const handleDestinationKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsOpen || suggestions.length === 0) {
      if (event.key === "Escape") {
        setSuggestionsOpen(false);
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setHighlightedSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      setHighlightedSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && highlightedSuggestion >= 0) {
      event.preventDefault();

      const suggestion = suggestions[highlightedSuggestion];

      if (suggestion) {
        selectSuggestion(suggestion);
      }
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
    }
  };

  const handleFindTrip = () => {
    const trimmedDestination = destination.trim();

    if (!trimmedDestination && !travelDate) {
      return;
    }

    onFindTrip(trimmedDestination, travelDate, selectedTrip ?? undefined);
  };

  return (
    <header
      className="hero"
      style={{
        backgroundImage: `url(${homeImages.hero})`,
        backgroundPosition: "center center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="hero-content">
        <h1 className="hero-title">So, where are we going?</h1>

        <p className="hero-subtitle">
          Curated journeys, interesting places, and great people to travel with.
        </p>

        <div className="hero-search active">
          <div className="search-field destination-field">
            <label htmlFor="destinationInput">Destination</label>

            <input
              type="text"
              id="destinationInput"
              placeholder="Where do you want to go?"
              value={destination}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && destination.trim().length > 0}
              aria-controls="destinationSuggestions"
              onFocus={() => {
                if (destination.trim()) {
                  setSuggestionsOpen(true);
                }
              }}
              onChange={(event) => {
                setDestination(event.target.value);
                setSelectedTrip(null);
                setSuggestionsOpen(true);
                setHighlightedSuggestion(-1);
              }}
              onKeyDown={handleDestinationKeyDown}
            />

            {suggestionsOpen && destination.trim() ? (
              <div className="destination-suggestions" id="destinationSuggestions" role="listbox">
                {suggestions.length > 0 ? (
                  suggestions.map((trip, index) => (
                    <button
                      key={trip.title}
                      type="button"
                      role="option"
                      aria-selected={highlightedSuggestion === index}
                      className={`destination-suggestion${
                        highlightedSuggestion === index ? " highlighted" : ""
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(trip)}
                    >
                      <span className="destination-suggestion-title">{trip.title}</span>

                      <span className="destination-suggestion-meta">
                        {trip.destination} · Upcoming:{" "}
                        {new Date(trip.start_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" — "}
                        {new Date(trip.end_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="destination-suggestion-empty">
                    No scheduled trip matches yet. You can still send us an enquiry for this place.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <DatePickerField
            id="home-travel-date"
            label="When"
            value={travelDate}
            onChange={setTravelDate}
            className="date-picker-field--hero"
          />

          <button className="search-submit" type="button" onClick={handleFindTrip}>
            Find My Trip
          </button>
        </div>
      </div>
    </header>
  );
}

const postcards = [
  {
    number: "01",
    title: (
      <>
        Go where the map
        <br />
        gets interesting.
      </>
    ),
    description: "Take the route less ordinary. Find places worth getting lost in.",
    image: homeImages.route,
    alt: "Scenic mountain route",
    reverse: false,
  },
  {
    number: "02",
    title: (
      <>
        Eat like
        <br />a local.
      </>
    ),
    description: "A little sugar & spice never hurt anyone.",
    image: homeImages.food,
    alt: "Local food experience",
    reverse: true,
  },
  {
    number: "03",
    title: (
      <>
        Find your kind
        <br />
        of crazy.
      </>
    ),
    description: "Or calm. Your people are here.",
    image: homeImages.people,
    alt: "People travelling together",
    reverse: false,
  },
];

export function WhySection() {
  return (
    <section className="why-chatpate" id="community">
      <div className="why-chatpate-header">
        <div className="why-chatpate-heading">
          <p className="section-eyebrow">WHY CHATPATE ROUTES?</p>

          <h2 className="section-title">
            Boring Travel is
            <br />
            just not our vibe.
          </h2>

          <a
            href="https://www.instagram.com/chatpate.routes.in/?hl=en"
            className="community-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join Community
            <span>↗</span>
          </a>
        </div>
      </div>

      <div className="postcard-grid">
        {postcards.map((card) => (
          <article className={`stamp${card.reverse ? " reverse" : ""}`} key={card.number}>
            <div className="card-content">
              {card.reverse ? (
                <>
                  <div className="card-copy">
                    <h3 className="card-title">{card.title}</h3>
                    <p className="card-description">{card.description}</p>
                  </div>
                  <div className="card-header">
                    <span className="card-number">{card.number}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="card-header">
                    <span className="card-number">{card.number}</span>
                  </div>
                  <div className="card-copy">
                    <h3 className="card-title">{card.title}</h3>
                    <p className="card-description">{card.description}</p>
                  </div>
                </>
              )}
            </div>

            <img className="card-image" src={card.image} alt={card.alt} loading="lazy" />
          </article>
        ))}
      </div>
    </section>
  );
}

export function FounderSection() {
  return (
    <section className="founder-section" id="about">
      <div className="founder-inner">
        <div className="founder-image-wrap">
          <img
            src={homeImages.founder}
            alt="Nishu Malik — Founder of Chatpate Routes"
            className="founder-image"
            loading="lazy"
          />
        </div>

        <div className="founder-content">
          <p className="founder-eyebrow">A note from Nishu</p>

          <h2 className="founder-title">
            A little story
            <br />
            behind the routes.
          </h2>

          <div className="founder-letter">
            <p>
              I started Chatpate Routes because I’ve always felt that travelling should be a little
              less predictable. Not just visiting the usual places, following a fixed itinerary and
              coming back with the same pictures everyone has.
            </p>
            <p>
              I wanted to create trips where you discover a random little place, eat something
              ridiculously good, take the longer route just because, and meet people who were
              strangers when the trip began.
            </p>
            <p>Basically, travel with a little more curiosity, chaos and chatpata-neess.</p>
          </div>

          <div className="founder-signature">
            <span>— Nishu Malik</span>
            <small>Founder, Chatpate Routes</small>
          </div>
        </div>
      </div>
    </section>
  );
}

const archives = [
  {
    image: homeImages.archive01,
    alt: "Chatpate Routes travel experience",
    cls: "tall",
    num: "01",
    caption: "Found somewhere worth stopping for.",
  },
  {
    image: homeImages.archive02,
    alt: "Local food experience",
    cls: "",
    num: "02",
    caption: "Someone ordered too much food. Again.",
  },
  {
    image: homeImages.archive03,
    alt: "Travellers enjoying a trip",
    cls: "medium",
    num: "03",
    caption: "Strangers → group chat → friends.",
  },
  {
    image: homeImages.archive04,
    alt: "Mountain travel experience",
    cls: "",
    num: "04",
    caption: "Took the longer route. No regrets.",
  },
  {
    image: homeImages.archive05,
    alt: "Travel moment",
    cls: "tall",
    num: "05",
    caption: "No plan. Somehow the best day.",
  },
  {
    image: homeImages.archive06,
    alt: "Friends travelling together",
    cls: "",
    num: "06",
    caption: "This wasn't on the itinerary.",
  },
];

export function ArchivesSection() {
  return (
    <section className="archives-section">
      <div className="archives-header">
        <div>
          <p className="archives-eyebrow">THE CHATPATE ARCHIVES</p>
          <h2 className="archives-title">
            The stories <br /> <i>you</i> didn’t plan for.
          </h2>
        </div>

        <p className="archives-intro">
          The detours, the meals, <br />
          the laughs, the people <br />
          that’s the Chatpate part.
        </p>
      </div>

      <div className="masonry-grid">
        {archives.map((item) => (
          <figure className={`archive-item ${item.cls}`.trim()} key={item.num}>
            <img src={item.image} alt={item.alt} loading="lazy" />
            <figcaption>
              <span>{item.num}</span>
              {item.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="archives-cta">
        <a href="#community" className="archives-btn">
          See the Community
          <span>↗</span>
        </a>
      </div>
    </section>
  );
}

type FeaturedMeetup = {
  id: string;
  title: string;
  destination: string;
  event_date: string | null;
  event_time: string | null;
  description: string;
  image_url: string | null;
  joining_details: string | null;
  join_url: string | null;
};

function formatMeetupDate(value: string | null) {
  if (!value) return "Coming Soon";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MeetupsSection() {
  const [meetup, setMeetup] = useState<FeaturedMeetup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/meetups", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Meetup unavailable");
        return (await response.json()) as { meetup?: FeaturedMeetup | null };
      })
      .then((result) => {
        if (active) setMeetup(result.meetup ?? null);
      })
      .catch(() => {
        if (active) setMeetup(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const joinHref =
    meetup?.join_url ||
    `https://wa.me/919266770149?text=${encodeURIComponent(
      meetup?.joining_details || "Hey! I’m interested in the next Chatpate Routes meetup.",
    )}`;

  return (
    <section className="meetups" id="meetups">
      <div className="meetups-inner">
        <div className="meetups-header">
          <div className="meetups-heading">
            <p className="meetups-eyebrow">MEETUPS</p>
            <h2>Unheard Travel Stories.</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="meetup-empty-state" role="status">
            Loading the featured meetup…
          </div>
        ) : meetup ? (
          <div className="meetup-feature">
            <div className="meetup-image">
              {meetup.image_url ? (
                <img
                  src={meetup.image_url}
                  alt={`${meetup.title} in ${meetup.destination}`}
                  loading="lazy"
                />
              ) : (
                <div className="meetup-image-placeholder">No meetup image</div>
              )}
              <span className="meetup-location">{meetup.destination}</span>
            </div>

            <div className="meetup-content">
              <div className="meetup-meta">
                <span>UPCOMING</span>
              </div>
              <h3>{meetup.title}</h3>
              <p>{meetup.description}</p>

              <div className="meetup-details">
                <div>
                  <span>DATE</span>
                  <strong>{formatMeetupDate(meetup.event_date)}</strong>
                </div>
                <div>
                  <span>TIME</span>
                  <strong>{meetup.event_time || "To be announced"}</strong>
                </div>
                <div>
                  <span>PLACE</span>
                  <strong>{meetup.destination}</strong>
                </div>
              </div>

              {meetup.joining_details ? (
                <p className="meetup-joining-details">{meetup.joining_details}</p>
              ) : null}

              <a href={joinHref} target="_blank" rel="noopener noreferrer" className="meetup-cta">
                Join the Meetup<span>↗</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="meetup-empty-state">
            <CalendarDays aria-hidden="true" />
            <p>No featured meetup is available right now. Check back soon.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function ItinerarySection() {
  return (
    <section className="itinerary">
      <div className="itinerary-inner">
        <div className="eyebrow">Your Route Could Be Next</div>

        <h2>Got a route, hidden gem or weekend plan worth sharing?</h2>

        <a
          href="https://wa.me/919266770149?text=Hey!%20I%20have%20a%20route%20I%E2%80%99d%20love%20to%20share%20with%20Chatpate%20Routes."
          target="_blank"
          rel="noopener noreferrer"
          className="itinerary-btn"
        >
          Submit Your Itinerary
          <span>↗</span>
        </a>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h2>
            Chatpate
            <br />
            Routes.
          </h2>
          <p>Boring Travel is just not our vibe.</p>
        </div>

        <div className="footer-links">
          <div className="footer-link-group">
            <span>Explore</span>
            <a href="/trips">Trips</a>
            <a href="#community">Community</a>
            <a href="#meetups">Meetups</a>
            <a href="#about">About</a>
          </div>

          <div className="footer-link-group">
            <span>Connect</span>
            <a
              href="https://www.instagram.com/chatpate.routes.in/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <a href="https://wa.me/919266770149" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>

          <div className="footer-link-group">
            <span>Legal</span>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms">Terms &amp; Conditions</a>
            <a href="/terms#cancellation">Returns & Refunds</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Chatpate Routes</span>
        <span>
          Made with ❤️ by{" "}
          <a href="https://techlearnsolutions.com/" target="_blank" rel="noopener noreferrer">
            TechLearn Solutions
          </a>
        </span>
      </div>
    </footer>
  );
}
