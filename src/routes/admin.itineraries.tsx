import { createFileRoute } from "@tanstack/react-router";
import AdminItinerariesPage from "@/components/admin/itineraries/AdminItinerariesPage";
import { AdminAreaLayout } from "@/components/admin/AdminAreaLayout";

export const Route = createFileRoute("/admin/itineraries")({
  component: () => (
    <AdminAreaLayout activePage="itineraries">
      <AdminItinerariesPage />
    </AdminAreaLayout>
  ),
});
