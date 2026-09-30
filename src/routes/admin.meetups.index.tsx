import { createFileRoute } from "@tanstack/react-router";
import AdminMeetupsPage from "@/components/admin/meetups/AdminMeetupsPage";

export const Route = createFileRoute("/admin/meetups/")({
  component: AdminMeetupsPage,
});
