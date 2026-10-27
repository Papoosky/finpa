import { describe, expect, it } from "vitest";
import { calculateDashboard } from "./dashboard";
import type { Transaction } from "../types";

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  uuid: crypto.randomUUID(),
  type: "expense",
  amount: 10,
  date: "2026-10-01",
  category: "Comida",
  description: null,
  installment_total: null,
  installment_number: null,
  installment_group: null,
  subscription_uuid: null,
  ...overrides,
});

describe("calculateDashboard", () => {
  it("calculates totals, categories and monthly values", () => {
    const result = calculateDashboard([
      transaction({ type: "income", amount: 100, category: "Salario" }),
      transaction({ amount: 30 }),
      transaction({ amount: 20, date: "2026-09-01" }),
    ]);

    expect(result.income).toBe(100);
    expect(result.expense).toBe(50);
    expect(result.balance).toBe(50);
    expect(result.categories[0]).toMatchObject({ name: "Comida", value: 50 });
    expect(result.monthly[9].income).toBe(100);
    expect(result.monthly[8].expense).toBe(20);
  });
});
