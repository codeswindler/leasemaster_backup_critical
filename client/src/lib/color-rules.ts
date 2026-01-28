import { getPaletteByName, type Palette } from "@/lib/palette";

type Thresholds = {
  low: number;
  high: number;
};

type ThresholdLevel = "low" | "ok" | "high";
type TrendDirection = "up" | "down" | "neutral";

const THRESHOLDS = {
  vacancyPercent: { low: 10, high: 25 },
  ratePercent: { low: 60, high: 90 },
  count: { low: 5, high: 20 },
  sharePercent: { low: 20, high: 40 },
} satisfies Record<string, Thresholds>;

const STATUS_PALETTE: Record<string, string> = {
  paid: "emerald",
  partially_paid: "amber",
  partial: "amber",
  pending: "blue",
  overdue: "rose",
  failed: "rose",
  approved: "emerald",
  canceled: "rose",
  cancelled: "rose",
  all: "violet",
};

const LEVEL_PALETTE = {
  good: "emerald",
  warn: "amber",
  bad: "rose",
  neutral: "blue",
} as const;

const getThresholdLevel = (value: number, thresholds: Thresholds): ThresholdLevel => {
  if (value < thresholds.low) return "low";
  if (value > thresholds.high) return "high";
  return "ok";
};

const getThresholdPalette = (
  value: number,
  thresholds: Thresholds,
  polarity: "higherBetter" | "lowerBetter" = "higherBetter",
): Palette => {
  const level = getThresholdLevel(value, thresholds);
  if (polarity === "higherBetter") {
    if (level === "low") return getPaletteByName(LEVEL_PALETTE.bad);
    if (level === "high") return getPaletteByName(LEVEL_PALETTE.good);
    return getPaletteByName(LEVEL_PALETTE.warn);
  }
  if (level === "low") return getPaletteByName(LEVEL_PALETTE.good);
  if (level === "high") return getPaletteByName(LEVEL_PALETTE.bad);
  return getPaletteByName(LEVEL_PALETTE.warn);
};

const getTrendDirectionFromLevel = (
  level: ThresholdLevel,
  polarity: "higherBetter" | "lowerBetter" = "higherBetter",
): TrendDirection => {
  if (polarity === "higherBetter") {
    if (level === "high") return "up";
    if (level === "low") return "down";
    return "neutral";
  }
  if (level === "low") return "up";
  if (level === "high") return "down";
  return "neutral";
};

const getTrendPalette = (direction: TrendDirection): Palette => {
  if (direction === "up") return getPaletteByName(LEVEL_PALETTE.good);
  if (direction === "down") return getPaletteByName(LEVEL_PALETTE.bad);
  return getPaletteByName(LEVEL_PALETTE.neutral);
};

const getStatusPalette = (status: string): Palette => {
  const key = status?.toLowerCase?.() ?? "";
  const paletteName = STATUS_PALETTE[key] ?? LEVEL_PALETTE.neutral;
  return getPaletteByName(paletteName);
};

const getSharePercent = (part: number, total: number) => {
  if (!total) return 0;
  return Math.round((part / total) * 100);
};

export type { Thresholds, ThresholdLevel, TrendDirection };
export {
  THRESHOLDS,
  getThresholdLevel,
  getThresholdPalette,
  getTrendDirectionFromLevel,
  getTrendPalette,
  getStatusPalette,
  getSharePercent,
};
