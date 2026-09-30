import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminAreaLayout } from "@/components/admin/AdminAreaLayout";

export const Route = createFileRoute("/admin/trips")({
  component: AdminTripsLayout,
});

function AdminTripsLayout() {
  return (
    <AdminAreaLayout activePage="trips">
      <Outlet />
    </AdminAreaLayout>
  );
}
