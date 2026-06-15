import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import { resolveEffective, computeNewValue } from "./raise";

describe("computeNewValue", () => {
  it("raises by percent", () => {
    expect(computeNewValue("percent", 5_000_000, 10)).toBe(5_500_000);
  });
  it("adds a fixed amount", () => {
    expect(computeNewValue("amount", 5_000_000, 500_000)).toBe(5_500_000);
  });
  it("sets an absolute value", () => {
    expect(computeNewValue("set", 5_000_000, 7_000_000)).toBe(7_000_000);
  });
  it("rounds to 2 decimals", () => {
    expect(computeNewValue("percent", 33.33, 10)).toBe(36.66);
  });
});

describe("resolveEffective", () => {
  it("returns today for 'today'", () => {
    expect(resolveEffective("today")).toBe(dayjs().format("YYYY-MM-DD"));
  });
  it("returns the first day of the month for 'month_start'", () => {
    expect(resolveEffective("month_start")).toBe(dayjs().startOf("month").format("YYYY-MM-DD"));
    expect(resolveEffective("month_start").endsWith("-01")).toBe(true);
  });
  it("returns the first day of next month for 'next_month'", () => {
    expect(resolveEffective("next_month")).toBe(dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD"));
    expect(resolveEffective("next_month").endsWith("-01")).toBe(true);
  });
  it("formats a custom date", () => {
    expect(resolveEffective("custom", new Date(2026, 5, 15))).toBe("2026-06-15");
  });
  it("returns empty string for a missing custom date", () => {
    expect(resolveEffective("custom", null)).toBe("");
  });
});
