import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "./server-env";

type AdminAccess = { supabase: SupabaseClient } | { error: Response };

export function getRequestSupabaseClient(request: Request) {
  const supabaseUrl = getServerEnv("SUPABASE_URL") || import.meta.env["VITE_SUPABASE_URL"];
  const supabaseKey =
    getServerEnv("SUPABASE_PUBLISHABLE_KEY") || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  const authorization = request.headers.get("Authorization");
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: authorization ? { Authorization: authorization } : {} },
  });
}

export async function requireAdmin(request: Request): Promise<AdminAccess> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: Response.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const supabase = getRequestSupabaseClient(request);
  const token = authorization.slice("Bearer ".length);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      error: Response.json(
        { success: false, message: "Invalid or expired authentication token." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return {
      error: Response.json(
        { success: false, message: "Administrator access required." },
        { status: 403 },
      ),
    };
  }

  return { supabase };
}
