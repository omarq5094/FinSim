"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readSupabaseConfig } from "@/lib/config";
import { companySchema, scenarioSchema } from "@/domain/setup";
import type { ActionState } from "@/lib/action-state";

const unavailable = { message: "ربط مشروع FinSim غير مكتمل. راجع إعدادات البيئة أولًا." };
const connectionError = { message: "تعذر الاتصال بالخدمة. حاول لاحقًا؛ لم يتم تأكيد الحفظ." };

export async function authenticate(_: ActionState, form: FormData): Promise<ActionState> {
  if (!readSupabaseConfig(process.env)) return unavailable;
  const input = z.object({ email: z.email().max(254), password: z.string().min(12).max(128), mode: z.enum(["login", "signup"]) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { message: "تحقق من البريد وكلمة المرور (12 حرفًا على الأقل)." };
  try {
    const client = await createClient();
    const { email, password, mode } = input.data;
    const { data, error } = mode === "signup" ? await client.auth.signUp({ email, password }) : await client.auth.signInWithPassword({ email, password });
    if (error) return { message: "تعذر إتمام الطلب. تحقق من البيانات وتأكيد البريد أو حاول لاحقًا." };
    if (!data.session) return { message: "راجع بريدك لتأكيد الحساب، ثم سجّل الدخول.", ok: true };
    if (data.user) {
      const { error: profileError } = await client.from("profiles").upsert({ id: data.user.id }, { onConflict: "id", ignoreDuplicates: true });
      if (profileError) return { message: "تم تسجيل الدخول، لكن ملف المستخدم غير جاهز. تحقق من تطبيق مخطط FinSim." };
    }
  } catch { return connectionError; }
  redirect("/");
}

export async function signOut(): Promise<void> {
  const client = await createClient();
  await client.auth.signOut();
  redirect("/login");
}

export async function createCompany(_: ActionState, form: FormData): Promise<ActionState> {
  if (!readSupabaseConfig(process.env)) return unavailable;
  const input = companySchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { message: "أدخل اسمًا ونشاطًا من حرفين على الأقل، وحدد حجم الشركة." };
  let id: string;
  try {
    const client = await createClient();
    const { data: user, error: authError } = await client.auth.getUser();
    if (authError || !user.user) return { message: "سجّل الدخول لحفظ شركتك." };
    const { data, error } = await client.from("companies").insert(input.data).select("id").single();
    if (error || !data) return { message: "لم تُحفظ الشركة. تحقق من تطبيق مخطط FinSim والصلاحيات ثم أعد المحاولة." };
    id = data.id;
  } catch { return connectionError; }
  revalidatePath("/");
  redirect(`/companies/${id}`);
}

export async function createScenario(_: ActionState, form: FormData): Promise<ActionState> {
  if (!readSupabaseConfig(process.env)) return unavailable;
  const input = scenarioSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { message: "راجع المدخلات: مبالغ موجبة أو صفر حتى منزلتين، مدة 1–120 شهرًا، عائد 0–100%، وافتراضات من 10 أحرف على الأقل." };
  try {
    const client = await createClient();
    const { data: user, error: authError } = await client.auth.getUser();
    if (authError || !user.user) return { message: "سجّل الدخول لحفظ الافتراضات." };
    const values = input.data;
    // Atomic invoker RPC: each row still passes RLS and composite tenant foreign keys.
    const { error } = await client.rpc("create_scenario_draft", {
      target_workspace: values.workspace_id, target_company: values.company_id, scenario_name: values.name,
      capital_minor: values.capital_minor, monthly_revenue_minor: values.monthly_revenue_minor,
      monthly_expenses_minor: values.monthly_expenses_minor, duration_months: values.duration_months,
      expected_annual_return_bps: values.expected_annual_return_bps, risk_level: values.risk_level, notes: values.notes,
      ...(values.project_id ? { target_project: values.project_id } : {}),
    });
    if (error) return { message: "لم تُحفظ الافتراضات. تحقق من صلاحية الوصول للشركة ثم أعد المحاولة." };
  } catch { return connectionError; }
  revalidatePath(`/companies/${input.data.company_id}`);
  return { message: "حُفظت مسودة الافتراضات. لم تُشغّل محاكاة أو تُحسب نتائج.", ok: true };
}

export async function createWorkspace(_: ActionState, form: FormData): Promise<ActionState> {
  if (!readSupabaseConfig(process.env)) return unavailable;
  const name = z.string().trim().min(2).max(120).safeParse(form.get("name"));
  if (!name.success) return { message: "أدخل اسم مؤسسة من حرفين إلى 120 حرفًا." };
  try {
    const client = await createClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return { message: "سجّل الدخول أولًا." };
    const { error } = await client.rpc("create_workspace", { workspace_name: name.data });
    if (error) return { message: "تعذر إنشاء المؤسسة. تحقق من تطبيق مخطط FinSim." };
  } catch { return connectionError; }
  revalidatePath("/");
  return { message: "أُنشئت مساحة المؤسسة وأُضيف حسابك مالكًا لها.", ok: true };
}

export async function setMember(_: ActionState, form: FormData): Promise<ActionState> {
  if (!readSupabaseConfig(process.env)) return unavailable;
  const values = z.object({ workspace_id: z.uuid(), user_id: z.uuid(), role: z.enum(["cfo", "analyst", "viewer", "remove"]) }).safeParse(Object.fromEntries(form));
  if (!values.success) return { message: "تحقق من معرّف العضو والمؤسسة والدور." };
  try {
    const client = await createClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return { message: "سجّل الدخول أولًا." };
    const { error } = await client.rpc("set_workspace_member", { target_workspace: values.data.workspace_id, target_user: values.data.user_id, member_role: values.data.role === "remove" ? null : values.data.role });
    if (error) return { message: "تعذر تعديل العضوية. يلزم أن تكون المالك وأن يكون العضو مسجلًا وله ملف مستخدم. لا يمكن تغيير دور المالك." };
  } catch { return connectionError; }
  revalidatePath("/");
  return { message: "حُدّثت عضوية المؤسسة.", ok: true };
}
