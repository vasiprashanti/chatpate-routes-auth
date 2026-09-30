import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdmin } from "../../../lib/server-supabase";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  destination: z.string().trim().min(1).max(160).optional(),
  event_date: z.string().date().nullable().optional(),
  event_time: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  image_url: z.string().url().nullable().optional(),
  image_path: z.string().trim().max(500).nullable().optional(),
  joining_details: z.string().trim().max(1000).nullable().optional(),
  join_url: z.string().url().nullable().optional(),
  status: z.enum(["draft", "published", "featured", "archived"]).optional(),
});

export const Route = createFileRoute("/api/admin/meetups/$meetupId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;

          const parsed = updateSchema.safeParse(await request.json());
          if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
            return Response.json(
              { success: false, message: "No valid meetup changes were provided." },
              { status: 400 },
            );
          }

          const { status, ...fields } = parsed.data;
          let previousImagePath: string | null = null;
          if (Object.keys(fields).length > 0) {
            if (fields.image_path !== undefined) {
              const { data: currentMeetup, error: readError } = await admin.supabase
                .from("meetups")
                .select("image_path")
                .eq("id", params.meetupId)
                .maybeSingle();
              if (readError) throw readError;
              if (!currentMeetup) {
                return Response.json(
                  { success: false, message: "Meetup not found." },
                  { status: 404 },
                );
              }
              previousImagePath = currentMeetup.image_path;
            }

            const { error } = await admin.supabase
              .from("meetups")
              .update(fields)
              .eq("id", params.meetupId);
            if (error) throw error;

            if (previousImagePath && previousImagePath !== fields.image_path) {
              const { error: storageError } = await admin.supabase.storage
                .from("trip-images")
                .remove([previousImagePath]);
              if (storageError) {
                console.warn("Could not remove replaced meetup image:", storageError.message);
              }
            }
          }

          if (status === "featured") {
            const { error } = await admin.supabase.rpc("set_featured_meetup", {
              target_meetup_id: params.meetupId,
            });
            if (error) throw error;
          } else if (status) {
            const { error } = await admin.supabase
              .from("meetups")
              .update({ status })
              .eq("id", params.meetupId);
            if (error) throw error;
          }

          const { data, error } = await admin.supabase
            .from("meetups")
            .select("*")
            .eq("id", params.meetupId)
            .maybeSingle();
          if (error) throw error;
          if (!data) {
            return Response.json({ success: false, message: "Meetup not found." }, { status: 404 });
          }

          return Response.json({ success: true, meetup: data });
        } catch (error) {
          console.error("PATCH /api/admin/meetups failed:", error);
          return Response.json(
            { success: false, message: "Could not update the meetup." },
            { status: 500 },
          );
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;

          const { data: meetup, error: readError } = await admin.supabase
            .from("meetups")
            .select("image_path")
            .eq("id", params.meetupId)
            .maybeSingle();
          if (readError) throw readError;
          if (!meetup) {
            return Response.json({ success: false, message: "Meetup not found." }, { status: 404 });
          }

          const { error: deleteError } = await admin.supabase
            .from("meetups")
            .delete()
            .eq("id", params.meetupId);
          if (deleteError) throw deleteError;

          if (meetup.image_path) {
            const { error: storageError } = await admin.supabase.storage
              .from("trip-images")
              .remove([meetup.image_path]);
            if (storageError) {
              console.warn("Could not remove old meetup image:", storageError.message);
            }
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error("DELETE /api/admin/meetups failed:", error);
          return Response.json(
            { success: false, message: "Could not delete the meetup." },
            { status: 500 },
          );
        }
      },
    },
  },
});
