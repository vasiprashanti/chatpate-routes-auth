import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "../../../lib/server-supabase";

export const Route = createFileRoute("/api/admin/itinerary-submissions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;
          const [{ data: submissions, error }, { data: setting, error: settingError }] =
            await Promise.all([
              admin.supabase
                .from("itinerary_submissions")
                .select("*")
                .order("created_at", { ascending: false }),
              admin.supabase
                .from("itinerary_submission_settings")
                .select("submission_fee")
                .eq("id", 1)
                .maybeSingle(),
            ]);
          if (error) throw error;
          if (settingError) throw settingError;

          const withPdfLinks = await Promise.all(
            (submissions ?? []).map(async (submission) => {
              if (!submission.pdf_path) return { ...submission, signed_pdf_url: null };
              const { data, error: signedUrlError } = await admin.supabase.storage
                .from("itinerary-submissions")
                .createSignedUrl(submission.pdf_path, 15 * 60);
              if (signedUrlError) {
                console.warn("Could not sign itinerary PDF URL:", signedUrlError.message);
                return { ...submission, signed_pdf_url: null };
              }
              return { ...submission, signed_pdf_url: data.signedUrl };
            }),
          );

          return Response.json(
            { success: true, submissions: withPdfLinks, fee: setting?.submission_fee ?? null },
            { headers: { "Cache-Control": "private, no-store" } },
          );
        } catch (error) {
          console.error("GET /api/admin/itinerary-submissions failed:", error);
          return Response.json(
            { success: false, message: "Could not load itinerary submissions." },
            { status: 500 },
          );
        }
      },
    },
  },
});
