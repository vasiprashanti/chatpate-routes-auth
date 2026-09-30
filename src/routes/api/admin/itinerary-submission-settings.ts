import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdmin } from "../../../lib/server-supabase";

const feeSchema = z.object({ submission_fee: z.number().positive().max(1000000) });

export const Route = createFileRoute("/api/admin/itinerary-submission-settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;
          const { data, error } = await admin.supabase
            .from("itinerary_submission_settings")
            .select("submission_fee,updated_at")
            .eq("id", 1)
            .single();
          if (error) throw error;
          return Response.json({ success: true, setting: data });
        } catch (error) {
          console.error("GET itinerary submission setting failed:", error);
          return Response.json(
            { success: false, message: "Could not load the submission fee setting." },
            { status: 500 },
          );
        }
      },
      PATCH: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;
          const parsed = feeSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              { success: false, message: "Enter a fee greater than ₹0." },
              { status: 400 },
            );
          }
          const { data, error } = await admin.supabase
            .from("itinerary_submission_settings")
            .upsert({
              id: 1,
              submission_fee: parsed.data.submission_fee,
              updated_at: new Date().toISOString(),
            })
            .select("submission_fee,updated_at")
            .single();
          if (error) throw error;
          return Response.json({ success: true, setting: data });
        } catch (error) {
          console.error("PATCH itinerary submission setting failed:", error);
          return Response.json(
            { success: false, message: "Could not save the submission fee." },
            { status: 500 },
          );
        }
      },
    },
  },
});
