import { z } from "zod";

export const companySchema = z.object({
  workspace_id: z.uuid(),
  name: z.string().trim().min(2).max(120),
  activity: z.string().trim().min(2).max(160),
  size: z.enum(["micro", "small", "medium", "large"]),
});

// Parse decimal strings to integer halalas without binary floating-point arithmetic.
const money = z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/).transform(value => {
  const [whole, fraction = ""] = value.split(".");
  return Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
});
const rate = z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/).transform(value => {
  const [whole, fraction = ""] = value.split(".");
  return Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
}).pipe(z.number().max(10000));

export const scenarioSchema = z.object({
  workspace_id: z.uuid(),
  company_id: z.uuid(),
  project_id: z.preprocess(value => value === "" ? undefined : value, z.uuid().optional()),
  name: z.string().trim().min(2).max(120),
  capital_minor: money,
  monthly_revenue_minor: money,
  monthly_expenses_minor: money,
  duration_months: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(120)),
  expected_annual_return_bps: rate,
  risk_level: z.enum(["low", "medium", "high"]),
  notes: z.string().trim().min(10).max(4000),
});

export const sizeLabels = { micro: "متناهي الصغر", small: "صغير", medium: "متوسط", large: "كبير" };
export const riskLabels = { low: "منخفضة", medium: "متوسطة", high: "مرتفعة" };
export const roleLabels = { owner: "مالك المؤسسة", cfo: "مدير مالي", analyst: "محلل", viewer: "مشاهد" };
export const formatSAR = (minor: number) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(minor / 100);
