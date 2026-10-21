/** Future engine boundary. No execution, snapshots, branching or AI arithmetic in week one. */
export type MoneyMinor = bigint;
export type SimulationInputV1 = Readonly<{
  schemaVersion: 1;
  companyId: string;
  scenarioId: string;
  currency: "SAR";
  periodUnit: "month";
  durationMonths: number;
  capitalMinor: MoneyMinor;
  monthlyRevenueMinor: MoneyMinor;
  monthlyExpensesMinor: MoneyMinor;
  expectedAnnualReturnBps: number;
  riskLevel: "low" | "medium" | "high";
  assumptions: string;
}>;
// Week 2: journal posting and reports must be pure functions of validated inputs/events.
// Week 6: explicit seed, engineVersion and event cursor will identify replayable runs.
