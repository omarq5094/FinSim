# FinSim AI

أساس الأسبوع الأول لمحاكي مالي ومحاسبي تفاعلي، باستخدام Next.js 16 وTypeScript وApp Router، بواجهة عربية RTL والريال السعودي.

هذه المرحلة تنشئ هوية الشركة ومساحة المؤسسة ومدخلات السيناريو فقط. المحرك المحاسبي والتقارير والتحليلات والذكاء الاصطناعي وتشغيل الزمن والحفظ والرجوع والتفرعات مؤجلة إلى مراحلها.

## التشغيل

يتطلب Node.js 22 أو أحدث وnpm. الإصدارات مثبتة وملف القفل موجود.

```powershell
npm ci
npm run dev
```

افتح http://localhost:3000. تظهر واجهة التأسيس دون إعداد سحابي، وتبقى الكتابات وتسجيل الدخول معطلة حتى إعداد مشروع FinSim المستقل.

## الموارد المؤكدة

- المستودع: [omarq5094/FinSim](https://github.com/omarq5094/FinSim)، كان فارغًا عند فحص بداية التنفيذ، والقراءة والكتابة متاحتان.
- Supabase: الاتصال يعمل لكنه يعرض مؤسسة ومشروع Maghsaltak فقط. **مؤسسة FinSim غير متاحة للحساب المتصل**، لذا لم ينشأ أو يعدل أي مشروع سحابي.
- يجب إنشاء/إتاحة مؤسسة FinSim في الحساب الصحيح، ثم إعادة ربط تكامل Supabase بذلك الحساب. لا تنشئ المشروع داخل مؤسسة Maghsaltak.
- Vercel والنشر مؤجلان. لم ننشئ مشروعًا أو ربطًا أو workflow نشر. ظهر فحص Vercel تلقائي فاشل بعد أول رفع، ما يشير إلى تكامل خارجي قائم؛ لم نغير إعداداته، وأوقفنا الرفع الإضافي لحين مراجعته.

## إعداد البيئة بعد توفير FinSim

انسخ `.env.example` إلى `.env.local` وأدخل:

| المتغير | الاستخدام |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | رابط مشروع FinSim المؤكد |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | مفتاح publishable عام فقط |
| SUPABASE_PROJECT_REF | مرجع المشروع المطابق للرابط للتحقق على الخادم |

لا يحتاج التطبيق كلمة مرور قاعدة البيانات أو service_role. لا ترسل أسرارًا في المحادثة أو تحفظها في Git. كل NEXT_PUBLIC_ يصل إلى المتصفح. حارس الاتصال يرفض مشروع المغسلة المعروف والرابط غير المطابق والمفاتيح السرية.

أنشئ مشروعًا باسم **FinSim** داخل مؤسسة **FinSim** بعد تأكيد التكلفة. مومباي ap-south-1 مرشح قريب جغرافيًا من الرياض ضمن قائمة الأداة الحالية؛ لم تعتمد منطقة أو تنشأ خدمة بعد. راجع [دليل Supabase](docs/supabase-setup.md) لإعدادات Data API وRLS وAuth وخطوات التحقق.

## مخطط البيانات

ملف التأسيس الوحيد: `supabase/migrations/20261021192951_workspace_foundation.sql`، مولد الاسم بأداة Supabase CLI، ومختبر محليًا ولم يطبق على السحابة.

الجداول: profiles، workspaces، workspace_memberships، companies، simulation_projects، scenarios، scenario_inputs، scenario_versions، simulation_events.

العزل على مستوى مساحة المؤسسة بواسطة RLS والعضويات. الأدوار: owner، cfo، analyst، viewer. المفاتيح الخارجية المركبة تمنع الروابط بين المؤسسات. توجد آلية تفعيل RLS تلقائي على الجداول العامة الجديدة، وسحب امتيازات الكائنات الجديدة مع GRANT صريح عند الحاجة. [تفاصيل الصلاحيات](docs/permissions.md).

## التدفق المجهز

بعد إعداد السحابة وتأكيد البريد: تسجيل الدخول ← إنشاء مساحة مؤسسة ← إنشاء شركة ← مشروع وسيناريو وافتراضات. المالك يضيف أعضاء مسجلين باستخدام UUID الحساب ويحدد أدوارهم. المحلل يضيف سيناريوهات إلى مشروع قائم، والمشاهد يقرأ فقط. هذه العمليات تظل محمية في قاعدة البيانات حتى عند تجاوز الواجهة.

الافتراضات بالهللة الصحيحة والنسب بنقاط أساس؛ 850,000 ريال = 85,000,000 هللة و18% = 1800 نقطة. العائد مدخل مستهدف، وليس نتيجة محسوبة. لا يستنتج النظام تدفقات نقدية من هذا المثال وحده.

## التحقق والأنواع

```powershell
npm run db:types:local
npm run check
npm audit
```

check يشمل ESLint وTypeScript وVitest وبناء الإنتاج. الاختبارات تطبق migration نفسها على PostgreSQL داخل PGlite بأدوار وهمية وواجهة auth.uid محلية، ثم تختبر RLS وعزل المؤسسات والأدوار والقيود والمعاملات الذرية وسجل الأحداث. لا تتصل بمشروع سحابي.

`src/lib/supabase/database.types.ts` مولد من كتالوج PostgreSQL محلي مطبق عليه المخطط، وليس من خدمة Supabase قائمة. المولد يشمل Row/Insert/Update وRPCs، ولا يولد روابط embedded joins. يعاد توليد الأنواع بالأداة الرسمية بعد إتاحة مشروع FinSim والتحقق من المخطط. CI يتحقق من عدم تقادم الأنواع، ويفحص التطبيق دون أسرار أو نشر.

Docker daemon غير مشغّل في بيئة التنفيذ، لذا حزمة Supabase المحلية الكاملة وAuth/PostgREST السحابيان لم يختبرا. [تقرير الحالة](docs/week-1-status.md) يوضح حدود التحقق.

## التنظيم

- src/app: الصفحات وServer Actions.
- src/components: نماذج الواجهة.
- src/domain: تحقق المدخلات وعقد المحرك المستقبلي؛ لا تنفيذ محاسبي.
- src/lib/supabase: عميل SSR وأنواع قاعدة البيانات.
- src/proxy.ts: تحديث جلسة المستخدم ومنع cache مشترك للصفحات الخاصة.
- supabase/migrations: المخطط والصلاحيات.
- tests: اختبارات المدخلات والمشروع وعزل المؤسسات.
- docs: البنية والصلاحيات والإعداد وحالة العمل.

## المراجع

[Next.js](https://nextjs.org/docs/app/getting-started/installation)، [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)، [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)، [تأمين Data API](https://supabase.com/docs/guides/api/securing-your-api)، [المناطق](https://supabase.com/docs/guides/platform/regions).
