import { createFileRoute } from "@tanstack/react-router";
import ItineraryPage from "@/components/itinerary/ItineraryPage";

export const Route = createFileRoute("/itinerary")({ component: ItineraryPage });
