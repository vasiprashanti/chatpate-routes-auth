import { createFileRoute } from "@tanstack/react-router";
import AdminBookingsPage from "@/components/admin/bookings/AdminBookingsPage";
import { AdminAreaLayout } from "@/components/admin/AdminAreaLayout";

export const Route = createFileRoute("/admin/bookings")({
  component: () => (
    <AdminAreaLayout activePage="bookings">
      <AdminBookingsPage />
    </AdminAreaLayout>
  ),
});
