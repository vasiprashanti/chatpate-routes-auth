import { createFileRoute } from "@tanstack/react-router";
import ItinerarySubmissionForm from "@/components/itinerary/ItinerarySubmissionForm";

export const Route = createFileRoute("/itinerary/submit")({ component: ItinerarySubmissionForm });
