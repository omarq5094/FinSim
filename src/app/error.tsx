"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="shell narrow panel"><h1 className="small-title">تعذر تحميل البيانات</h1><p>تحقق من الاتصال ومخطط قاعدة البيانات ثم أعد المحاولة.</p><button className="primary" onClick={reset}>إعادة المحاولة</button></div>;
}
