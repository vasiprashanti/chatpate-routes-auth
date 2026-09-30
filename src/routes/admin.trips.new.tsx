import { createFileRoute } from "@tanstack/react-router";
import AdminTripEditor from "../components/admin/trips/AdminTripEditor";

export const Route = createFileRoute("/admin/trips/new")({
  component: AdminNewTripRoute,
});

function AdminNewTripRoute() {
  return <AdminTripEditor tripId="new" initialSection={undefined} />;
}
