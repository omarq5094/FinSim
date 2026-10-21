import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ScenarioForm } from "@/components/forms";
import { createClient } from "@/lib/supabase/server";
import { readSupabaseConfig } from "@/lib/config";
import { formatSAR, riskLabels, roleLabels } from "@/domain/setup";

export const dynamic = "force-dynamic";
export default async function Company({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !readSupabaseConfig(process.env)) notFound();
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: company, error } = await client.from("companies").select("id, workspace_id, name, activity").eq("id", id).maybeSingle();
  if (error) throw new Error("Company data unavailable");
  if (!company) notFound();
  const [membership, projects] = await Promise.all([
    client.from("workspace_memberships").select("role").eq("workspace_id",company.workspace_id).eq("user_id",auth.user.id).single(),
    client.from("simulation_projects").select("id,name").eq("workspace_id",company.workspace_id).eq("company_id",id).limit(100),
  ]);
  if (membership.error || projects.error) throw new Error("Workspace data unavailable");
  const projectIds = projects.data.map(p => p.id);
  const scenarios = projectIds.length ? await client.from("scenarios").select("id,name").eq("workspace_id",company.workspace_id).in("project_id",projectIds).order("created_at",{ascending:false}).limit(100) : { data:[],error:null };
  if (scenarios.error) throw new Error("Scenario data unavailable");
  const scenarioIds = (scenarios.data ?? []).map(s => s.id);
  const inputs = scenarioIds.length ? await client.from("scenario_inputs").select("*").eq("workspace_id",company.workspace_id).in("scenario_id",scenarioIds) : {data:[],error:null};
  if (inputs.error) throw new Error("Inputs unavailable");
  const names = new Map((scenarios.data??[]).map(s => [s.id,s.name]));
  const role = membership.data.role;
  const canWrite = role !== "viewer" && (role !== "analyst" || projects.data.length>0);
  return <div className="shell"><Link href="/">← جميع الشركات</Link>
    <section className="page-heading"><span className="eyebrow">إعداد الشركة</span><h1 className="small-title">{company.name}</h1><p>{company.activity} · ريال سعودي · فترات شهرية · {roleLabels[role as keyof typeof roleLabels]}</p></section>
    <div className="workspace-grid"><section className="panel"><h2>افتراضات السيناريو</h2><p>احفظ المدخلات للدراسة لاحقًا. لا تُحسب نتائج في هذه المرحلة.</p>{canWrite ? <ScenarioForm companyId={id} workspaceId={company.workspace_id} projects={projects.data} role={role} /> : <p className="notice">{role === "viewer" ? "صلاحيتك للقراءة فقط." : "يحتاج المحلل مشروع محاكاة ينشئه المالك أو المدير المالي أولًا."}</p>}</section>
      <section className="panel"><h2>مسودات الافتراضات</h2><p>العائد أدناه هدف يدخله المستخدم، وليس ربحًا متوقعًا محسوبًا.</p>{inputs.data?.length ? inputs.data.map(draft => <article className="draft" key={draft.id}><h3>{names.get(draft.scenario_id)}</h3><dl><div><dt>الاستثمار الأولي</dt><dd>{formatSAR(draft.capital_minor)}</dd></div><div><dt>الإيراد / شهر</dt><dd>{formatSAR(draft.monthly_revenue_minor)}</dd></div><div><dt>المصروف / شهر</dt><dd>{formatSAR(draft.monthly_expenses_minor)}</dd></div><div><dt>المدة</dt><dd>{draft.duration_months} شهرًا</dd></div><div><dt>العائد السنوي المستهدف</dt><dd>{draft.expected_annual_return_bps/100}%</dd></div><div><dt>المخاطرة</dt><dd>{riskLabels[draft.risk_level as keyof typeof riskLabels]}</dd></div></dl><p className="notes">{draft.notes}</p><small>مسودة مدخلات · لم تبدأ المحاكاة</small></article>) : <div className="empty"><h3>لا توجد مسودات بعد</h3><p>أدخل الافتراضات ثم احفظها لتظهر هنا.</p></div>}</section>
    </div></div>;
}
