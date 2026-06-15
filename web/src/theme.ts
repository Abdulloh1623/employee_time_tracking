import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Brand blue (matches the TimeGate palette used across the documents)
const brand: MantineColorsTuple = [
  "#e9f1fb",
  "#d2e0f0",
  "#a3bfe1",
  "#719dd3",
  "#4a80c7",
  "#306dc0",
  "#2364bd",
  "#1554a8",
  "#0a4b97",
  "#003f86",
];

export const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  defaultRadius: "md",
  fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif",
  headings: { fontFamily: "Inter, Segoe UI, Roboto, sans-serif", fontWeight: "700" },
});
