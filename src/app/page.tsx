import Link from "next/link";
import { CompanyForm, WorkspaceForm, MemberForm } from "@/components/forms";
import { readSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { sizeLabels, roleLabels } from "@/domain/setup";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured = Boolean(readSupabaseConfig(process.env));
  let signedIn = false;
  let loadError = false;
  let userId = "";
  let workspaces: { id: string; name: string; owner_id: string }[] = [];
  let memberships: { workspace_id: string; user_id: string; role: string }[] = [];
  let companies: { id: string; name: string; activity: string; size: keyof typeof sizeLabels }[] = [];
  if (configured) {
    try {
      const client = await createClient();
      const { data, error: authError } = await client.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError") loadError = true;
      signedIn = Boolean(data.user);
      if (signedIn) {
        userId = data.user!.id;
        const [ws, members, result] = await Promise.all([
          client.from("workspaces").select("id,name,owner_id").order("created_at").limit(100),
          client.from("workspace_memberships").select("workspace_id,user_id,role").eq("user_id",userId).limit(100),
          client.from("companies").select("id,name,activity,size").order("created_at", { ascending: false }).limit(100),
        ]);
        if (result.error || ws.error || members.error) loadError = true;
        else { companies = (result.data ?? []) as typeof companies; workspaces = ws.data ?? []; memberships = members.data ?? []; }
      }
    } catch { loadError = true; }
  }
  const managed = workspaces.filter(w => memberships.some(m => m.workspace_id===w.id && ["owner","cfo"].includes(m.role)));
  const owned = workspaces.filter(w => w.owner_id===userId);
  return <div className="shell">
    <section className="hero">
      <div className="eyebrow">من الافتراض إلى القرار</div>
      <h1>ابنِ شركتك.<br /><span>وافهم أثر كل قرار.</span></h1>
      <p className="lead">مساحة لتصميم شركتك الافتراضية، وتوثيق افتراضاتك، والاستعداد لاختبار القرارات المالية بوضوح.</p>
      <div className="hero-meta"><span><i /> بيئة تأسيس</span><span>حسابات حتمية قابلة للاختبار</span><span>مصمّم للسوق السعودي</span></div>
    </section>
    <section className="notice" aria-label="حالة الإعداد"><div><strong>{!configured ? "الربط السحابي بانتظار الإعداد" : loadError ? "تعذر التحقق من الخدمة" : signedIn ? "مساحة الشركة جاهزة للإعداد" : "سجّل الدخول لحفظ شركتك"}</strong><p>{!configured ? "يمكنك استعراض الهيكل الآن. إنشاء الشركات والحفظ يتطلبان مشروع FinSim مستقلًا وإعداد متغيرات البيئة." : loadError ? "تحقق من الاتصال وتطبيق المخطط والصلاحيات. لا يمكن تأكيد تحميل البيانات الآن." : "احفظ بيانات الشركة وافتراضات السيناريو. تشغيل المحاكاة والتقارير يأتيان في المراحل التالية."}</p></div>{configured && (signedIn ? <form action={signOut}><button className="secondary">تسجيل الخروج</button></form> : <Link className="button secondary" href="/login">تسجيل الدخول ←</Link>)}</section>
    <div className="workspace-grid">
      <section className="panel"><div className="section-head"><span className="step">01</span><div><h2>شركة جديدة</h2><p>ابدأ بالهوية التشغيلية لمشروعك</p></div></div><CompanyForm workspaces={managed} disabled={!configured || !signedIn || loadError || !managed.length} /><hr /><h2>مساحة المؤسسة</h2><WorkspaceForm disabled={!configured || !signedIn || loadError} /></section>
      <section className="panel companies"><div className="section-head"><span className="step">02</span><div><h2>شركاتك الافتراضية</h2><p>كل شركة مساحة مستقلة ببياناتها</p></div><span className="count">{companies.length}</span></div>
        {companies.length ? <ul className="company-list">{companies.map(company => <li key={company.id}><Link href={`/companies/${company.id}`}><span className="company-symbol">{company.name.charAt(0)}</span><div><h3>{company.name}</h3><p>{company.activity} · {sizeLabels[company.size]}</p></div><span aria-hidden>←</span></Link></li>)}</ul> : <div className="empty"><div className="empty-icon" aria-hidden>▤</div><h3>{loadError ? "تعذر تحميل الشركات" : "هنا تبدأ قصة شركتك"}</h3><p>{loadError ? "أعد المحاولة بعد التحقق من الخدمة." : "بعد إعداد الاتصال وتسجيل الدخول، أنشئ شركة ثم أدخل افتراضاتك المالية."}</p><div className="empty-tags"><span>النشاط</span><span>رأس المال</span><span>المدة</span><span>المخاطرة</span></div></div>}
      </section>
    </div>
    {signedIn && !loadError && <section className="panel organization-panel"><h2>مؤسساتك وصلاحياتك</h2><ul>{workspaces.map(w => <li key={w.id}>{w.name} · {roleLabels[memberships.find(m => m.workspace_id===w.id)?.role as keyof typeof roleLabels] ?? "عضو"}</li>)}</ul><p>معرّف حسابك للمشاركة مع مالك المؤسسة: <bdi>{userId}</bdi></p>{owned.length>0 && <><h3>إدارة العضويات</h3><p>للمالك فقط. أدخل معرّف مستخدم سجّل الدخول وله ملف في FinSim.</p><MemberForm workspaces={owned} /></>}</section>}
    <section className="roadmap" aria-label="مراحل العمل"><div><span className="eyebrow">مسار البناء</span><h2>أساس واضح. ثم محاكاة موثوقة.</h2></div><ol>{[["01", "التأسيس", "الأسبوع 1 · المرحلة الحالية"], ["02", "المحاسبة والتشغيل", "الأسابيع 2–5"], ["03", "الزمن والمسارات", "الأسبوع 6"], ["04", "التحليل والتجربة", "الأسابيع 7–9"]].map(([n, title, time], index) => <li className={index === 0 ? "active" : ""} key={n}><span>{n}</span><h3>{title}</h3><p>{time}</p></li>)}</ol></section>
    <p className="footnote">العائد المستهدف ليس نتيجة محاكاة. المراجع الذكي سيشرح النتائج والافتراضات؛ ولا يغيّر السجلات المحاسبية.</p>
  </div>;
}
