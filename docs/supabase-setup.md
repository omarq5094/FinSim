# إعداد Supabase الفعلي

المؤسسة FinSim (fskyjgabjttvjxnsprel) والمشروع FinSim (eavlsxplctfvlmhjmbvz) موجودان بالخطة المجانية. المنطقة الحالية Sydney ap-southeast-2. مخطط FinSim طُبق؛ لا تعِد تشغيل migration الابتدائية على هذا المشروع.

## الاتصال

.env.local يحتوي NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY وSUPABASE_PROJECT_REF. القيم كلها معرّفات ومفتاح عام؛ لا يحتاج التطبيق كلمة مرور قاعدة البيانات أو service_role/secret. الملف مستبعد من Git. لا تنقل بيانات مشروع آخر أو تضع أسرارًا في NEXT_PUBLIC_ أو logs.

تكامل Supabase الإداري الحالي يرفض الوصول للمشروع الجديد؛ يجب إعادة ربطه بالحساب/المؤسسة الصحيحة قبل استخدام CLI/MCP للإدارة. تنفيذ التأسيس تم من جلسة Dashboard المخوّلة. هذا يختلف عن عميل التطبيق الذي يتصل بالمشروع الصحيح بالفعل.

## المخطط والتاريخ

الملف supabase/migrations/20261021192951_workspace_foundation.sql أُنشئ اسمه عبر CLI، ثم اختبر على PGlite وطبق عبر SQL Editor. أُنشئت بيانات تاريخ الترحيل بالبنية القياسية version/text وstatements/text[] وname/text، وسُجل الإصدار 20261021192951 واسم workspace_foundation داخل نفس المعاملة. لا ينفذ الملف نفسه BEGIN/COMMIT، لتوافق أدوات الترحيل التي تدير المعاملات.

راجع التاريخ والحالة قبل أي تغيير لاحق. لا تستخدم db reset أو تحذف موارد قائمة. أي تعديل تالٍ يأتي في migration جديدة، وليس بتغيير الإصدار المطبق.

## Data API وRLS

Data API مفعّل، auto-expose معطّل، وautomatic RLS مفعّل. المخطط يفعّل RLS صراحة ويفرضها على كل جدول، ويمنح امتيازات أعمدة محددة لدور authenticated مع سياسات العضوية.

finsim_internal غير مكشوف لـData API. دالة Dashboard المسماة rls_auto_enable نقلت إليه وأصبحت SECURITY INVOKER، مع الحفاظ على trigger. لا توجد دالة مميزة في public. امتيازات الكائنات الجديدة تتطلب منحًا صريحًا، وتخص افتراضيًا دور DDL الذي نفذ الترحيل.

```sql
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r';
select tablename,policyname,cmd from pg_policies where schemaname='public';
select version,name from supabase_migrations.schema_migrations;
select proname from pg_proc where pronamespace='public'::regnamespace and prosecdef;
```

النتيجة المؤكدة: تسعة جداول، 20 سياسة، migration واحدة، وصفر دوال public ذات SECURITY DEFINER. Security Advisors بعد إعادة الفحص يعرض صفر أخطاء وتحذيرات.

## Auth

البريد مفعّل وتأكيده مطلوب، والتسجيل المجهول معطّل. طول كلمة المرور الأدنى 12 وSecure password change مفعّل. لم تُغيّر أي كلمة مرور قائمة. ميزة منع كلمات المرور المسربة مدفوعة ولم تُفعّل.

حساب التطبيق مستقل عن حساب Dashboard. رابط التأكيد الافتراضي يؤكد البريد ثم يسجل المستخدم الدخول بكلمة مرور التطبيق. لا توجد OAuth أو استعادة كلمة مرور في الأسبوع الأول.

بعد النشر حُفظ Site URL بالقيمة `https://finsim-ai-navy.vercel.app`، وروابط التطوير المسموحة `http://localhost:3000` و`http://127.0.0.1:3000` فقط. أُعيد تحميل صفحة الإعداد للتحقق من الحفظ. لا توجد wildcards.

## التحقق والأنواع

scripts/sql/verify-cloud-security.sql اختبر SQL الحقيقي بأدوار owner/cfo/analyst/viewer وهويات وهمية داخل rollback. لا يكتب كلمات مرور أو credentials ولا يترك بيانات. نجحت الحدود ومنع العضوية غير المصرح بها والروابط المختلطة وanon.

كتالوج Cloud صدر من information_schema/pg_proc، وأنواع TypeScript الناتجة تطابقت مع توليد PGlite المحلي حرفيًا. للمولد وضع ملف كتالوج اختياري:
```powershell
node scripts/generate-types.mjs <verified-catalog.json>
```

عند عودة الاتصال الإداري يمكن استخدام generate_typescript_types الرسمي بعد مراجعة الفروق. حزمة Supabase المحلية الكاملة تحتاج Docker، وهو غير مشغّل هنا.

اختبار واجهة تسجيل الدخول وإنشاء الشركة يتطلب حساب تطبيق صالحًا؛ محاولة دخول المستخدم لم تنجح، فلا يوصف التدفق الكامل بأنه اجتاز الاختبار.
