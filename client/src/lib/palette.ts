type Palette = {
  name: string;
  card: string;
  border: string;
  iconBg: string;
  icon: string;
  badge: string;
  accentText: string;
  accentBg: string;
};

const palettes: Palette[] = [
  {
    name: "emerald",
    card: "bg-emerald-500/[0.05] dark:bg-emerald-500/10",
    border: "border-emerald-200/70 dark:border-emerald-500/30",
    iconBg: "bg-emerald-500/10",
    icon: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/60",
    accentText: "text-emerald-700 dark:text-emerald-300",
    accentBg: "bg-emerald-500/10",
  },
  {
    name: "blue",
    card: "bg-blue-500/[0.05] dark:bg-blue-500/10",
    border: "border-blue-200/70 dark:border-blue-500/30",
    iconBg: "bg-blue-500/10",
    icon: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/60",
    accentText: "text-blue-700 dark:text-blue-300",
    accentBg: "bg-blue-500/10",
  },
  {
    name: "violet",
    card: "bg-violet-500/[0.05] dark:bg-violet-500/10",
    border: "border-violet-200/70 dark:border-violet-500/30",
    iconBg: "bg-violet-500/10",
    icon: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200/60",
    accentText: "text-violet-700 dark:text-violet-300",
    accentBg: "bg-violet-500/10",
  },
  {
    name: "amber",
    card: "bg-amber-500/[0.05] dark:bg-amber-500/10",
    border: "border-amber-200/70 dark:border-amber-500/30",
    iconBg: "bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/60",
    accentText: "text-amber-700 dark:text-amber-300",
    accentBg: "bg-amber-500/10",
  },
  {
    name: "rose",
    card: "bg-rose-500/[0.05] dark:bg-rose-500/10",
    border: "border-rose-200/70 dark:border-rose-500/30",
    iconBg: "bg-rose-500/10",
    icon: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/60",
    accentText: "text-rose-700 dark:text-rose-300",
    accentBg: "bg-rose-500/10",
  },
  {
    name: "teal",
    card: "bg-teal-500/[0.05] dark:bg-teal-500/10",
    border: "border-teal-200/70 dark:border-teal-500/30",
    iconBg: "bg-teal-500/10",
    icon: "text-teal-600 dark:text-teal-400",
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200/60",
    accentText: "text-teal-700 dark:text-teal-300",
    accentBg: "bg-teal-500/10",
  },
];

const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
};

const getPaletteByIndex = (index: number) => palettes[index % palettes.length];

const getPaletteByKey = (key: string, seed = 0) => {
  const hashed = hashString(`${key}:${seed}`);
  return getPaletteByIndex(hashed);
};

const getSessionSeed = (storageKey: string) => {
  if (typeof window === "undefined") return 0;
  const key = `palette-seed:${storageKey}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return Number(existing);
  const seed = Math.floor(Math.random() * 1_000_000);
  window.sessionStorage.setItem(key, seed.toString());
  return seed;
};

export type { Palette };
export { palettes, getPaletteByIndex, getPaletteByKey, getSessionSeed };
