import { describe, expect, it } from "vitest";
import { scenarioSchema } from "../src/domain/setup";
import { readSupabaseConfig } from "../src/lib/config";

const input = {
  workspace_id: "11111111-1111-4111-8111-111111111111",
  company_id: "11111111-1111-4111-8111-111111111111", name: "فرع الرياض",
  capital_minor: "850000", monthly_revenue_minor: "0", monthly_expenses_minor: "0",
  duration_months: "12", expected_annual_return_bps: "18", risk_level: "high",
  notes: "الإيرادات والمصروفات غير مقدرة بعد. هذا اختبار مدخلات فقط.",
};
describe("assumption inputs", () => {
  it("represents the Riyadh example as inputs without inventing cash flows", () => {
    const result = scenarioSchema.parse(input);
    expect(result.capital_minor).toBe(85000000);
    expect(result.expected_annual_return_bps).toBe(1800);
    expect(result.risk_level).toBe("high");
  });
  it("preserves halalas exactly", () => {
    expect(scenarioSchema.parse({ ...input, capital_minor: "0.29" }).capital_minor).toBe(29);
    expect(scenarioSchema.parse({ ...input, capital_minor: "9999999999.99" }).capital_minor).toBe(999999999999);
  });
  it.each(["-1", "1.001", "1e6", "", "NaN", "10000000000", "1,000"])("rejects ambiguous or invalid money %s", capital_minor => {
    expect(scenarioSchema.safeParse({ ...input, capital_minor }).success).toBe(false);
  });
  it.each(["0", "121", "12.5", ""])("rejects invalid duration %s", duration_months => {
    expect(scenarioSchema.safeParse({ ...input, duration_months }).success).toBe(false);
  });
  it("rejects out of range return targets and missing assumptions", () => {
    expect(scenarioSchema.safeParse({ ...input, expected_annual_return_bps: "100.01" }).success).toBe(false);
    expect(scenarioSchema.safeParse({ ...input, notes: "" }).success).toBe(false);
  });
});

describe("project isolation", () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst" };
  it("requires explicit matching project and publishable key", () => {
    expect(readSupabaseConfig(env)).not.toBeNull();
    expect(readSupabaseConfig({})).toBeNull();
    expect(readSupabaseConfig({ ...env, SUPABASE_PROJECT_REF: "wrong" })).toBeNull();
    expect(readSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_notallowed" })).toBeNull();
  });
  it("blocks the existing laundry project", () => {
    expect(readSupabaseConfig({ ...env, SUPABASE_PROJECT_REF: "tfxjhfdwpulqardzryjt", NEXT_PUBLIC_SUPABASE_URL: "https://tfxjhfdwpulqardzryjt.supabase.co" })).toBeNull();
  });
});
