import dayjs from "dayjs";
import type { RaiseEffectiveOption, RaiseMethod } from "../types";

/** Resolve one of the four effective-date options into an ISO (yyyy-mm-dd) date. */
export function resolveEffective(opt: RaiseEffectiveOption, custom?: Date | null): string {
  switch (opt) {
    case "today":
      return dayjs().format("YYYY-MM-DD");
    case "month_start":
      return dayjs().startOf("month").format("YYYY-MM-DD");
    case "next_month":
      return dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD");
    case "custom":
      return custom ? dayjs(custom).format("YYYY-MM-DD") : "";
    default:
      return dayjs().format("YYYY-MM-DD");
  }
}

/** Client-side mirror of the backend raise math (rounded to 2 decimals). */
export function computeNewValue(method: RaiseMethod, current: number, value: number): number {
  let result: number;
  switch (method) {
    case "percent":
      result = current * (1 + value / 100);
      break;
    case "amount":
      result = current + value;
      break;
    case "set":
      result = value;
      break;
    default:
      result = current;
  }
  return Math.round((result + Number.EPSILON) * 100) / 100;
}
