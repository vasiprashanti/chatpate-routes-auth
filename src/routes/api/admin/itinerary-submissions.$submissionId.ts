import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdmin } from "../../../lib/server-supabase";

const updateSchema = z.object({
  review_status: z.enum(["pending_review", "under_review", "approved", "rejected"]).optional(),
  payment_status: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  creator_tag: z.enum(["explorer", "trip_creator", "co_host"]).optional(),
});

export const Route = createFileRoute("/api/admin/itinerary-submissions/$submissionId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;
          const parsed = updateSchema.safeParse(await request.json());
          if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
            return Response.json(
              { success: false, message: "Choose a valid status or creator tag." },
              { status: 400 },
            );
          }
          const { data, error } = await admin.supabase
            .from("itinerary_submissions")
            .update(parsed.data)
            .eq("id", params.submissionId)
            .select("id")
            .maybeSingle();
          if (error) throw error;
          if (!data)
            return Response.json(
              { success: false, message: "Submission not found." },
              { status: 404 },
            );
          return Response.json({ success: true });
        } catch (error) {
          console.error("PATCH /api/admin/itinerary-submissions failed:", error);
          return Response.json(
            { success: false, message: "Could not update the submission." },
            { status: 500 },
          );
        }
      },
    },
  },
});
