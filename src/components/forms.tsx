"use client";

import { useActionState } from "react";
import { authenticate, createCompany, createScenario, createWorkspace, setMember } from "@/app/actions";
import { sizeLabels, riskLabels } from "@/domain/setup";

const initial = { message: "" };

export function CompanyForm({ disabled = false, workspaces = [] }: { disabled?: boolean; workspaces?: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createCompany, initial);
  return <form action={action} className="stack">
    <fieldset disabled={disabled || pending} className="stack">
      <label>المؤسسة<select name="workspace_id" required defaultValue={workspaces[0]?.id ?? ""}><option value="" disabled>اختر المؤسسة</option>{workspaces.map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select></label>
      <label>اسم الشركة<input name="name" required minLength={2} maxLength={120} placeholder="مثال: آفاق للتجارة" /></label>
      <label>النشاط<input name="activity" required minLength={2} maxLength={160} placeholder="مثال: تجارة التجزئة" /></label>
      <label>حجم الشركة<select name="size" defaultValue="small">{Object.entries(sizeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="primary" type="submit">{pending ? "جارٍ الحفظ…" : "إنشاء الشركة ←"}</button>
    </fieldset>
    <p role="status" className="feedback">{state.message}</p>
  </form>;
}

export function AuthForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(authenticate, initial);
  return <form action={action} className="stack">
    <fieldset disabled={disabled || pending} className="stack">
      <label>البريد الإلكتروني<input name="email" type="email" autoComplete="email" required dir="ltr" /></label>
      <label>كلمة المرور<input name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={128} dir="ltr" /></label>
      <small>12 حرفًا على الأقل. لا تستخدم كلمة مرور قاعدة البيانات.</small>
      <button className="primary" name="mode" value="login" type="submit">{pending ? "جارٍ الإرسال…" : "تسجيل الدخول"}</button>
      <button className="secondary" name="mode" value="signup" type="submit">إنشاء حساب جديد</button>
    </fieldset>
    <p role="status" className="feedback">{state.message}</p>
  </form>;
}

export function ScenarioForm({ companyId, workspaceId, projects, role }: { companyId: string; workspaceId: string; projects: { id: string; name: string }[]; role: string }) {
  const [state, action, pending] = useActionState(createScenario, initial);
  return <form action={action} className="stack">
    <input type="hidden" name="company_id" value={companyId} />
    <input type="hidden" name="workspace_id" value={workspaceId} />
    <fieldset disabled={pending} className="form-grid">
      <label className="span-two">مشروع المحاكاة<select name="project_id" required={role === "analyst"} defaultValue={role === "analyst" ? projects[0]?.id ?? "" : ""}>{role !== "analyst" && <option value="">إنشاء مشروع جديد مع المسودة</option>}{projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      <label className="span-two">اسم السيناريو<input name="name" required minLength={2} maxLength={120} placeholder="مثال: دراسة فرع الرياض" /></label>
      <label>رأس المال / الاستثمار الأولي (ر.س)<input name="capital_minor" type="number" min="0" max="9999999999.99" step="0.01" required placeholder="850000" /></label>
      <label>الإيراد الشهري المفترض (ر.س)<input name="monthly_revenue_minor" type="number" min="0" max="9999999999.99" step="0.01" required /></label>
      <label>المصروف الشهري المفترض (ر.س)<input name="monthly_expenses_minor" type="number" min="0" max="9999999999.99" step="0.01" required /></label>
      <label>المدة (أشهر)<input name="duration_months" type="number" min="1" max="120" step="1" required /></label>
      <label>العائد السنوي المستهدف (%)<input name="expected_annual_return_bps" type="number" min="0" max="100" step="0.01" required placeholder="18" /></label>
      <label>مستوى المخاطرة<select name="risk_level" defaultValue="medium">{Object.entries(riskLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="span-two">الافتراضات وحدود الدراسة<textarea name="notes" required minLength={10} maxLength={4000} rows={4} placeholder="وضّح توقيت التحصيل والسداد، وتكوين الاستثمار، والتمويل، والضرائب، وموسمية الإيرادات. العائد المستهدف افتراض وليس نتيجة محسوبة." /></label>
      <button className="primary span-two" type="submit">{pending ? "جارٍ الحفظ…" : "حفظ مسودة الافتراضات"}</button>
    </fieldset>
    <p role="status" className="feedback">{state.message}</p>
  </form>;
}

export function WorkspaceForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(createWorkspace, initial);
  return <form action={action} className="stack"><fieldset disabled={disabled || pending} className="stack"><label>اسم المؤسسة داخل التطبيق<input name="name" required minLength={2} maxLength={120} placeholder="مثال: مؤسسة آفاق" /></label><small>مساحة بيانات داخل FinSim، وليست إنشاء مشروع Supabase.</small><button className="secondary" type="submit">{pending ? "جارٍ الإنشاء…" : "إنشاء مساحة مؤسسة"}</button></fieldset><p role="status" className="feedback">{state.message}</p></form>;
}

export function MemberForm({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(setMember, initial);
  return <form action={action} className="stack"><fieldset disabled={pending} className="form-grid"><label>المؤسسة<select name="workspace_id" required>{workspaces.map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select></label><label>معرّف المستخدم<input name="user_id" required dir="ltr" placeholder="UUID" /></label><label>الدور<select name="role"><option value="viewer">مشاهد</option><option value="analyst">محلل</option><option value="cfo">مدير مالي</option><option value="remove">إزالة العضوية</option></select></label><button className="secondary" type="submit">{pending ? "جارٍ التحديث…" : "تحديث العضوية"}</button></fieldset><p role="status" className="feedback">{state.message}</p></form>;
}
