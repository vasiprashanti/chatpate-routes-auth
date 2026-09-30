import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import "@/styles/home.css";
import { BookingModal, type BookingDraft } from "@/components/home/BookingModal";
import { HomeNav } from "@/components/home/HomeNav";
import {
  HeroSection,
  WhySection,
  FounderSection,
  ArchivesSection,
  MeetupsSection,
  ItinerarySection,
  SiteFooter,
} from "@/components/home/HomeSections";
import { UpcomingTrips } from "@/components/home/UpcomingTrips";
import { getCurrentTripDate } from "@/lib/trip-dates";
import { filterTripsByDateOrMonth, matchesTripDestination } from "@/lib/trip-search";

type SearchTrip = {
  id: string;
  title: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chatpate Routes — Curated Group Trips & Travel Community" },
      {
        name: "description",
        content:
          "Curated journeys, interesting places and great people to travel with. Join Chatpate Routes group trips across the Himalayas, Rajasthan and beyond.",
      },
      { property: "og:title", content: "Chatpate Routes — Curated Group Trips" },
      {
        property: "og:description",
        content:
          "Boring travel is just not our vibe. Discover upcoming group trips, Delhi meetups and a travel community worth joining.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nothing+You+Could+Do&family=Caveat:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const closeBooking = useCallback(() => setBookingDraft(null), []);

  return (
<div className="home-page">
  <HomeNav />

  <main>
    <HeroSection
      onFindTrip={async (destination, travelDate) => {
        const trimmedDestination = destination.trim();

        if (!trimmedDestination && !travelDate) return;

        if (!destination.trim() && travelDate) {
          navigate({
            to: "/trips",
            search: { month: "", date: travelDate, q: "" },
          });
          return;
        }

        try {
          const response = await fetch("/api/trips");

          if (!response.ok) {
            throw new Error("Failed to fetch trips");
          }

          const result = await response.json();

          if (!result.success || !Array.isArray(result.trips)) {
            throw new Error("Invalid trips response");
          }

          const allTrips = result.trips as SearchTrip[];
          const destinationTrips = allTrips.filter((trip) =>
            matchesTripDestination(trip, trimmedDestination),
          );

          const dateFilteredDestinationTrips = filterTripsByDateOrMonth(
            destinationTrips.map((trip) => ({
              ...trip,
              startDate: trip.start_date ?? null,
              endDate: trip.end_date ?? null,
            })),
            travelDate,
            getCurrentTripDate(),
          ).trips;

          if (
            trimmedDestination &&
            (destinationTrips.length === 0 ||
              (travelDate && dateFilteredDestinationTrips.length === 0))
          ) {
            setBookingDraft({ trip: trimmedDestination, travelDate });
            return;
          }

          navigate({
            to: "/trips",
            search: { month: "", date: travelDate, q: trimmedDestination },
          });
        } catch (error) {
          console.error("Failed to find trip:", error);

          navigate({
            to: "/trips",
            search: { month: "", date: travelDate, q: trimmedDestination },
          });
        }
      }}
    />

    <UpcomingTrips />
    <WhySection />
    <FounderSection />
    <ArchivesSection />
    <MeetupsSection />
    <ItinerarySection />
  </main>
      <SiteFooter />
      {bookingDraft ? <BookingModal draft={bookingDraft} onClose={closeBooking} /> : null}
    </div>
  );
}
