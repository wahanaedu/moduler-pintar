import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminFlag = await checkIsAdmin(context.userId);
    return { isAdmin: adminFlag, userId: context.userId };
  });

export const getMyApprovalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("approved, full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const adminFlag = await checkIsAdmin(context.userId);
    return {
      approved: profile?.approved ?? false,
      isAdmin: adminFlag,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminFlag = await checkIsAdmin(context.userId);
    if (!adminFlag) throw new Error("Forbidden: admin only");

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, sekolah, kabupaten, provinsi, approved, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("user_id, role");
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    });

    return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
  });

export const setUserApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), approved: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const adminFlag = await checkIsAdmin(context.userId);
    if (!adminFlag) throw new Error("Forbidden: admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ approved: data.approved, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });