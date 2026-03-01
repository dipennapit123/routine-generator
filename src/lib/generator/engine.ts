import type { DayIndex } from "./types";

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i * 1000) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildSlotKey(day: number, period: number): string {
  return `${day}-${period}`;
}

export function getFixedSlotTypes(
  periodsPerDay: number,
  breaks: { afterPeriod: number; type: string }[],
  assemblyPeriod: number | null
): ("CLASS" | "BREAK" | "LUNCH" | "ASSEMBLY" | "FREE")[] {
  const slotTypes: ("CLASS" | "BREAK" | "LUNCH" | "ASSEMBLY" | "FREE")[] = Array(periodsPerDay).fill("CLASS");
  for (const b of breaks) {
    if (b.afterPeriod >= 0 && b.afterPeriod < periodsPerDay) {
      slotTypes[b.afterPeriod] = b.type === "LUNCH" ? "LUNCH" : "BREAK";
    }
  }
  // Never put assembly in period 0 so period 1 can be class teacher
  if (assemblyPeriod !== null && assemblyPeriod >= 1 && assemblyPeriod < periodsPerDay) {
    slotTypes[assemblyPeriod] = "ASSEMBLY";
  }
  return slotTypes;
}

export function getAvailablePeriods(
  slotTypes: ("CLASS" | "BREAK" | "LUNCH" | "ASSEMBLY" | "FREE")[]
): number[] {
  const periods: number[] = [];
  slotTypes.forEach((t, i) => {
    if (t === "CLASS" || t === "FREE") periods.push(i);
  });
  return periods;
}

export { shuffle, seededRandom };
