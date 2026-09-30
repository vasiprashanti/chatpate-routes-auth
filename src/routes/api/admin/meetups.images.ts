import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "../../../lib/server-supabase";

const imageExtensions: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const Route = createFileRoute("/api/admin/meetups/images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          if ("error" in admin) return admin.error;

          const file = (await request.formData()).get("file");
          if (!(file instanceof File) || !(file.type in imageExtensions)) {
            return Response.json(
              { success: false, message: "Choose a JPEG, PNG, WebP, or AVIF image." },
              { status: 400 },
            );
          }
          if (file.size > 8 * 1024 * 1024) {
            return Response.json(
              { success: false, message: "Image must be 8 MB or smaller." },
              { status: 413 },
            );
          }

          const imagePath = `meetups/${crypto.randomUUID()}.${imageExtensions[file.type]}`;
          const { error } = await admin.supabase.storage
            .from("trip-images")
            .upload(imagePath, file, {
              contentType: file.type,
              upsert: false,
            });
          if (error) throw error;

          const { data } = admin.supabase.storage.from("trip-images").getPublicUrl(imagePath);
          return Response.json({
            success: true,
            image_url: data.publicUrl,
            image_path: imagePath,
          });
        } catch (error) {
          console.error("POST /api/admin/meetups/images failed:", error);
          return Response.json(
            { success: false, message: "Could not upload the meetup image." },
            { status: 500 },
          );
        }
      },
    },
  },
});
