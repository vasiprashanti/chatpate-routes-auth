import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminAreaLayout } from "@/components/admin/AdminAreaLayout";

export const Route = createFileRoute("/admin/meetups")({
  component: AdminMeetupsLayout,
});

function AdminMeetupsLayout() {
  return (
    <AdminAreaLayout activePage="meetups">
      <Outlet />
    </AdminAreaLayout>
  );
}
