import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getRequestSupabaseClient } from "../../lib/server-supabase";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const submissionSchema = z.object({
  submission_method: z.enum(["manual", "pdf"]),
  title: z.string().trim().min(2).max(160),
  destination: z.string().trim().min(2).max(240),
  starting_location: z.string().trim().max(240).optional().default(""),
  travel_months: z.array(z.enum(monthNames)).min(1).max(12),
  duration: z.string().trim().min(1).max(100),
  estimated_budget: z.number().positive().optional().nullable(),
  itinerary_details: z.string().trim().max(12000).optional().nullable(),
  additional_notes: z.string().trim().max(4000).optional().nullable(),
  pdf_path: z.string().trim().max(500).optional().nullable(),
  cohost_interest: z.enum(["yes", "no", "maybe"]),
  submitter_name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(32),
  consent: z.literal(true),
});

async function getUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const supabase = getRequestSupabaseClient(request);
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : { supabase, user: data.user };
}

export const Route = createFileRoute("/api/itinerary-submissions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabase = getRequestSupabaseClient(request);
          const { data: setting, error: settingError } = await supabase
            .from("itinerary_submission_settings")
            .select("submission_fee")
            .eq("id", 1)
            .maybeSingle();
          if (settingError) throw settingError;

          const identity = await getUser(request);
          if (!identity) {
            return Response.json({
              success: true,
              fee: setting?.submission_fee ?? null,
              submissions: [],
            });
          }

          const { data: submissions, error } = await identity.supabase
            .from("itinerary_submissions")
            .select(
              "id,title,destination,duration,travel_months,review_status,payment_status,created_at",
            )
            .eq("user_id", identity.user.id)
            .order("created_at", { ascending: false });
          if (error) throw error;
          return Response.json(
            { success: true, fee: setting?.submission_fee ?? null, submissions: submissions ?? [] },
            { headers: { "Cache-Control": "private, no-store" } },
          );
        } catch (error) {
          console.error("GET /api/itinerary-submissions failed:", error);
          return Response.json(
            { success: false, message: "Could not load itinerary submissions." },
            { status: 500 },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const identity = await getUser(request);
          if (!identity) {
            return Response.json(
              { success: false, message: "Sign in to submit your itinerary." },
              { status: 401 },
            );
          }

          const parsed = submissionSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              { success: false, message: "Please check the required itinerary details." },
              { status: 400 },
            );
          }

          const submission = parsed.data;
          if (submission.submission_method === "manual" && !submission.itinerary_details?.trim()) {
            return Response.json(
              { success: false, message: "Add your itinerary details before submitting." },
              { status: 400 },
            );
          }
          if (
            submission.submission_method === "manual" &&
            (!submission.starting_location.trim() ||
              !submission.estimated_budget ||
              submission.estimated_budget <= 0)
          ) {
            return Response.json(
              {
                success: false,
                message:
                  "Manual entries need a starting location and an estimated budget greater than ₹0.",
              },
              { status: 400 },
            );
          }
          if (submission.submission_method === "pdf") {
            if (!submission.pdf_path || !submission.pdf_path.startsWith(`${identity.user.id}/`)) {
              return Response.json(
                { success: false, message: "Upload your PDF itinerary before submitting." },
                { status: 400 },
              );
            }
            const uploadedFileName = submission.pdf_path.split("/").pop();
            if (!uploadedFileName) {
              return Response.json(
                { success: false, message: "The uploaded itinerary PDF could not be verified." },
                { status: 400 },
              );
            }
            const { data: uploadedFile, error: fileError } = await identity.supabase.storage
              .from("itinerary-submissions")
              .list(identity.user.id, { search: uploadedFileName });
            if (fileError || !uploadedFile?.length) {
              return Response.json(
                { success: false, message: "The uploaded itinerary PDF could not be verified." },
                { status: 400 },
              );
            }
          }

          const { data: setting, error: settingError } = await identity.supabase
            .from("itinerary_submission_settings")
            .select("submission_fee")
            .eq("id", 1)
            .single();
          if (settingError) throw settingError;
          const fee = Number(setting.submission_fee);
          if (!Number.isFinite(fee) || fee <= 0) {
            return Response.json(
              { success: false, message: "The itinerary submission fee is not configured yet." },
              { status: 409 },
            );
          }

          const { data: saved, error } = await identity.supabase
            .from("itinerary_submissions")
            .insert({
              ...submission,
              user_id: identity.user.id,
              fee_amount: fee,
              payment_status: "pending",
              review_status: "pending_review",
            })
            .select("id,title,fee_amount,payment_status,review_status,created_at")
            .single();
          if (error) throw error;

          return Response.json({ success: true, submission: saved }, { status: 201 });
        } catch (error) {
          console.error("POST /api/itinerary-submissions failed:", error);
          return Response.json(
            { success: false, message: "Could not submit your itinerary. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
