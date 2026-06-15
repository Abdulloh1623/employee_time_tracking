import { describe, it, expect } from "vitest";
import { formatMoney, inclusiveDays, adjustmentSign } from "./format";

describe("formatMoney", () => {
  it("groups thousands and appends currency", () => {
    expect(formatMoney(5200000)).toBe("5 200 000 UZS");
  });
  it("supports a custom currency", () => {
    expect(formatMoney(1000, "USD")).toBe("1 000 USD");
  });
  it("handles zero", () => {
    expect(formatMoney(0)).toBe("0 UZS");
  });
});

describe("inclusiveDays", () => {
  it("counts both endpoints", () => {
    expect(inclusiveDays("2026-07-01", "2026-07-10")).toBe(10);
  });
  it("is 1 for the same day", () => {
    expect(inclusiveDays("2026-07-01", "2026-07-01")).toBe(1);
  });
});

describe("adjustmentSign", () => {
  it("adds bonuses and allowances", () => {
    expect(adjustmentSign("bonus")).toBe(1);
    expect(adjustmentSign("allowance")).toBe(1);
  });
  it("subtracts fines and deductions", () => {
    expect(adjustmentSign("fine")).toBe(-1);
    expect(adjustmentSign("deduction")).toBe(-1);
    expect(adjustmentSign("advance")).toBe(-1);
  });
});
