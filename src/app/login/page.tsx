import Link from "next/link";
import { AuthForm } from "@/components/forms";
import { readSupabaseConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export default function Login() {
  const configured = Boolean(readSupabaseConfig(process.env));
  return <div className="shell narrow"><Link href="/">← العودة لمساحة الشركة</Link><section className="panel"><span className="eyebrow">حسابك في FinSim</span><h1 className="small-title">ابدأ من هنا</h1><p>استخدم بريدك وكلمة مرور حساب التطبيق.</p>{!configured && <p className="notice">ربط مشروع FinSim غير مكتمل. تسجيل الدخول غير متاح بعد.</p>}<AuthForm disabled={!configured} /></section></div>;
}
