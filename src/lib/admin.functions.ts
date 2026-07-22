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

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        newPassword: z
          .string()
          .min(6, "Kata sandi minimal 6 karakter")
          .regex(/[A-Z]/, "Harus mengandung huruf kapital")
          .regex(/[0-9]/, "Harus mengandung angka")
          .regex(/[^A-Za-z0-9]/, "Harus mengandung karakter khusus"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
        email: z.string().trim().email("Email tidak valid").max(255),
        password: z.string().min(6, "Kata sandi minimal 6 karakter").max(128),
        approved: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const adminFlag = await checkIsAdmin(context.userId);
    if (!adminFlag) throw new Error("Forbidden: admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Gagal membuat akun");
    // Trigger handle_new_user creates the profile+role. Update approved & name.
    await supabaseAdmin
      .from("profiles")
      .update({
        approved: data.approved,
        full_name: data.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newId);
    return { ok: true, userId: newId };
  });