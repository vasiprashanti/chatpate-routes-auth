import { createFileRoute } from "@tanstack/react-router";
import AdminTripEditor from "../components/admin/trips/AdminTripEditor";

export const Route = createFileRoute("/admin/trips/$tripId/edit")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { section?: "bookings" } =>
    search["section"] === "bookings" ? { section: "bookings" } : {},
  component: AdminTripEditorRoute,
});

function AdminTripEditorRoute() {
  const { tripId } = Route.useParams();
  const { section } = Route.useSearch();

  return <AdminTripEditor tripId={tripId} initialSection={section} />;
}
