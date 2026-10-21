import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "FinSim AI | مساحة تأسيس الشركة", description: "محاكي مالي ومحاسبي تفاعلي. ابدأ بتحديد شركتك وافتراضاتك بالريال السعودي." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>
    <a className="skip-link" href="#main">انتقل إلى المحتوى</a>
    <header className="topbar"><Link href="/" className="brand"><span className="brand-icon">F</span><span dir="ltr">FinSim <em>AI</em></span></Link><span className="topnote">مساحة القرار المالي</span><span className="pill">المرحلة 01 · التأسيس</span></header>
    <main id="main">{children}</main>
    <footer><span dir="ltr">FinSim AI</span><span>العملة: الريال السعودي · الفترة الأساسية: شهر</span><span>الأرقام تبدأ من افتراضاتك</span></footer>
  </body></html>;
}
