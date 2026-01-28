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
    card: "bg-emerald-500/[0.16] dark:bg-emerald-500/22",
    border: "border-emerald-200/95 dark:border-emerald-500/40",
    iconBg: "bg-emerald-500/22",
    icon: "text-emerald-800 dark:text-emerald-300",
    badge: "bg-emerald-500/22 text-emerald-900 dark:text-emerald-300 border-emerald-200/75",
    accentText: "text-emerald-800 dark:text-emerald-300",
    accentBg: "bg-emerald-500/22",
  },
  {
    name: "blue",
    card: "bg-blue-500/[0.16] dark:bg-blue-500/22",
    border: "border-blue-200/95 dark:border-blue-500/40",
    iconBg: "bg-blue-500/22",
    icon: "text-blue-800 dark:text-blue-300",
    badge: "bg-blue-500/22 text-blue-900 dark:text-blue-300 border-blue-200/75",
    accentText: "text-blue-800 dark:text-blue-300",
    accentBg: "bg-blue-500/22",
  },
  {
    name: "violet",
    card: "bg-violet-500/[0.16] dark:bg-violet-500/22",
    border: "border-violet-200/95 dark:border-violet-500/40",
    iconBg: "bg-violet-500/22",
    icon: "text-violet-800 dark:text-violet-300",
    badge: "bg-violet-500/22 text-violet-900 dark:text-violet-300 border-violet-200/75",
    accentText: "text-violet-800 dark:text-violet-300",
    accentBg: "bg-violet-500/22",
  },
  {
    name: "amber",
    card: "bg-amber-500/[0.16] dark:bg-amber-500/22",
    border: "border-amber-200/95 dark:border-amber-500/40",
    iconBg: "bg-amber-500/22",
    icon: "text-amber-800 dark:text-amber-300",
    badge: "bg-amber-500/22 text-amber-900 dark:text-amber-300 border-amber-200/75",
    accentText: "text-amber-800 dark:text-amber-300",
    accentBg: "bg-amber-500/22",
  },
  {
    name: "rose",
    card: "bg-rose-500/[0.16] dark:bg-rose-500/22",
    border: "border-rose-200/95 dark:border-rose-500/40",
    iconBg: "bg-rose-500/22",
    icon: "text-rose-800 dark:text-rose-300",
    badge: "bg-rose-500/22 text-rose-900 dark:text-rose-300 border-rose-200/75",
    accentText: "text-rose-800 dark:text-rose-300",
    accentBg: "bg-rose-500/22",
  },
  {
    name: "teal",
    card: "bg-teal-500/[0.16] dark:bg-teal-500/22",
    border: "border-teal-200/95 dark:border-teal-500/40",
    iconBg: "bg-teal-500/22",
    icon: "text-teal-800 dark:text-teal-300",
    badge: "bg-teal-500/22 text-teal-900 dark:text-teal-300 border-teal-200/75",
    accentText: "text-teal-800 dark:text-teal-300",
    accentBg: "bg-teal-500/22",
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

const getPaletteByName = (name: string) => {
  const match = palettes.find((palette) => palette.name === name);
  return match ?? getPaletteByIndex(0);
};

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
export { palettes, getPaletteByIndex, getPaletteByKey, getPaletteByName, getSessionSeed };
