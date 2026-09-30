import { createFileRoute } from "@tanstack/react-router";
import { getRequestSupabaseClient } from "../../lib/server-supabase";

export const Route = createFileRoute("/api/meetups")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabase = getRequestSupabaseClient(request);
          const { data, error } = await supabase
            .from("meetups")
            .select(
              "id, title, destination, event_date, event_time, description, image_url, joining_details, join_url",
            )
            .eq("status", "featured")
            .maybeSingle();

          if (error) {
            console.error("Public meetup query failed:", error.message);
            return Response.json(
              { success: false, message: "Meetup details are unavailable." },
              { status: 503, headers: { "Cache-Control": "no-store" } },
            );
          }

          return Response.json(
            { success: true, meetup: data },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("GET /api/meetups failed:", error);
          return Response.json(
            { success: false, message: "Meetup details are unavailable." },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
