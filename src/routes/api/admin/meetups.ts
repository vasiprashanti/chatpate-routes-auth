import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdmin } from "../../../lib/server-supabase";

const meetupSchema = z.object({
  title: z.string().trim().min(1).max(160),
  destination: z.string().trim().min(1).max(160),
  event_date: z.string().date().nullable().optional(),
  event_time: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().min(1).max(4000),
  image_url: z.string().url().nullable().optional(),
  image_path: z.string().trim().max(500).nullable().optional(),
  joining_details: z.string().trim().max(1000).nullable().optional(),
  join_url: z.string().url().nullable().optional(),
  status: z.enum(["draft", "published", "featured", "archived"]).default("draft"),
});

export const Route = createFileRoute("/api/admin/meetups")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;

          const { data, error } = await admin.supabase
            .from("meetups")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;
          return Response.json(
            { success: true, meetups: data ?? [] },
            { headers: { "Cache-Control": "private, no-store" } },
          );
        } catch (error) {
          console.error("GET /api/admin/meetups failed:", error);
          return Response.json(
            { success: false, message: "Could not load meetups." },
            { status: 500 },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;

          const parsed = meetupSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              { success: false, message: "Check the meetup fields and try again." },
              { status: 400 },
            );
          }

          const requestedStatus = parsed.data.status;
          const { data: meetup, error } = await admin.supabase
            .from("meetups")
            .insert({ ...parsed.data, status: "draft" })
            .select("*")
            .single();

          if (error) throw error;

          if (requestedStatus === "featured") {
            const { error: featureError } = await admin.supabase.rpc("set_featured_meetup", {
              target_meetup_id: meetup.id,
            });
            if (featureError) throw featureError;
            meetup.status = "featured";
          } else if (requestedStatus !== "draft") {
            const { error: statusError } = await admin.supabase
              .from("meetups")
              .update({ status: requestedStatus })
              .eq("id", meetup.id);
            if (statusError) throw statusError;
            meetup.status = requestedStatus;
          }

          return Response.json({ success: true, meetup }, { status: 201 });
        } catch (error) {
          console.error("POST /api/admin/meetups failed:", error);
          return Response.json(
            { success: false, message: "Could not save the meetup." },
            { status: 500 },
          );
        }
      },
    },
  },
});
