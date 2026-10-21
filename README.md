# FinSim AI

أساس الأسبوع الأول لمحاكي مالي ومحاسبي تفاعلي، باستخدام Next.js 16 وTypeScript وApp Router، بواجهة عربية RTL والريال السعودي.

المحرك المحاسبي والتقارير والتحليلات والذكاء الاصطناعي وتشغيل الزمن والحفظ والرجوع والتفرعات مؤجلة إلى مراحلها.

## التشغيل

يتطلب Node.js 22 أو أحدث وnpm. الإصدارات مثبتة وملف القفل موجود.

```powershell
npm ci
npm run dev
```

افتح http://localhost:3000. انسخ .env.example إلى .env.local وأدخل قيم مشروع FinSim المؤكد. لا يحتاج التطبيق كلمة مرور قاعدة البيانات أو service_role أو مفتاح secret.

| المتغير | الاستخدام |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | رابط مشروع FinSim |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | مفتاح publishable عام فقط |
| SUPABASE_PROJECT_REF | مرجع المشروع المطابق للرابط |

كل NEXT_PUBLIC_ يصل إلى المتصفح. الحارس يرفض مشروع المغسلة المعروف والرابط غير المطابق والمفاتيح السرية، وملفات البيئة المحلية مستبعدة من Git.

## الموارد المؤكدة

- [GitHub: omarq5094/FinSim](https://github.com/omarq5094/FinSim).
- [Supabase: FinSim](https://supabase.com/dashboard/project/eavlsxplctfvlmhjmbvz)، داخل مؤسسة FinSim، المرجع fskyjgabjttvjxnsprel، بالخطة المجانية.
- المنطقة الفعلية: Sydney، ap-southeast-2. النموذج أُعد سابقًا لمومباي، لكن المشروع القائم أُنشئ في سيدني؛ حُفظ دون حذف أو إعادة إنشاء. تحسين المنطقة للسعودية قرار لاحق.
- لا توجد تغييرات على أي مورد Maghsaltak.
- أذن المستخدم لاحقًا بالنشر على Vercel. مشروع finsim-ai القائم مرتبط بالمستودع نفسه؛ النشر التلقائي معطل في vercel.json، والنشر اليدوي فقط ضمن الإذن.

## البيانات والصلاحيات

migration: supabase/migrations/20261021192951_workspace_foundation.sql. طُبقت على مشروع FinSim عبر SQL Editor، وسجلت نسختها 20261021192951 في supabase_migrations.schema_migrations في نفس المعاملة. لم ينجح الوصول الإداري عبر تكامل Supabase الحالي، لأنه ما زال مرتبطًا بوصول آخر؛ جلسة Dashboard وفرت مسار التنفيذ المصرح.

الجداول التسعة: profiles، workspaces، workspace_memberships، companies، simulation_projects، scenarios، scenario_inputs، scenario_versions، simulation_events. تفعيل RLS مفروض عليها كلها مع 20 سياسة، وأدوار owner/cfo/analyst/viewer. الروابط المركبة تمنع روابط المؤسسات المختلطة. [الصلاحيات](docs/permissions.md).

الإصدارات بنية مستقبلية فقط، بلا وظائف تشغيل أو نقاط حفظ أو مسارات بديلة. الأحداث سجل تغييرات للمسودات وليست قيودًا محاسبية.

بعد تأكيد بريد حساب التطبيق: تسجيل الدخول ← إنشاء مساحة مؤسسة ← شركة ← مشروع وسيناريو وافتراضات. حساب FinSim مستقل عن تسجيل الدخول إلى لوحة Supabase. المالك يدير عضويات مستخدمين مسجلين باستخدام UUID؛ لا توجد دعوات بريد آلية.

الأموال بالهللة الصحيحة والنسب بنقاط أساس: 850,000 ريال = 85,000,000 هللة و18% = 1800 نقطة. العائد مدخل مستهدف وليس نتيجة محسوبة.

## التحقق

```powershell
npm run db:types:local
npm run check
npm run check:secrets
npm audit
```

check يشمل ESLint وTypeScript وVitest وبناء الإنتاج. نجح 73 اختبارًا محليًا. اختبارات SQL تطبق migration نفسها على PGlite وتفحص RLS والأدوار والتفويض والمعاملات الذرية.

scripts/sql/verify-cloud-security.sql اختبر PostgreSQL السحابي نفسه بهويات وصفوف وهمية داخل معاملة أُلغيت بالكامل. نجح عزل المؤسسات وحدود الأدوار ومنع تصعيد العضوية والروابط المختلطة وسحب الوصول والقراءة المجهولة. اختُبر Data API من عميل Supabase عام وأعاد 401/42501 للقراءة المجهولة. Security Advisors بعد إعادة الفحص: 0 أخطاء و0 تحذيرات.

الأنواع src/lib/supabase/database.types.ts مولدة من كتالوج PostgreSQL؛ جرى توليدها أيضًا من تصدير كتالوج FinSim السحابي وتطابقت مع الأنواع المحلية حرفيًا. المولد لا يولد العلاقات اللازمة لـembedded joins؛ التطبيق يستعلم صراحة دونها.

Docker daemon غير مشغّل؛ حزمة Supabase المحلية الكاملة لم تُشغل. لا يُعد اختبار SQL بديلًا عن اختبار تسجيل مستخدم وحفظ عبر الواجهة: [الحالة التفصيلية](docs/week-1-status.md).

## التنظيم

src/app للصفحات وServer Actions، src/components للنماذج، src/domain للمدخلات وعقد المحرك المستقبلي، src/lib/supabase لعميل SSR والأنواع، src/proxy.ts للجلسة، supabase/migrations للمخطط، scripts/sql لفحوص السحابة، tests للاختبارات وdocs للتوثيق.

[إعداد Supabase](docs/supabase-setup.md) · [البنية](docs/architecture.md) · [Next.js](https://nextjs.org/docs/app/getting-started/installation) · [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
