import Link from "next/link";
export default function NotFound() {
  return <div className="shell narrow panel"><h1 className="small-title">الصفحة غير متاحة</h1><p>قد لا تكون الشركة متاحة لحسابك أو أن الرابط غير صحيح.</p><Link className="button primary" href="/">العودة لمساحة الشركة</Link></div>;
}
