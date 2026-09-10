import type { Difficulty, RaceStanding, RaceSettings } from './types';

export const SUMMER_TRACKS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;
export const CHAMPIONSHIP_POINTS = [10, 8, 6, 5, 4, 3, 2, 1] as const;
const STORAGE_KEY = 'rc-championship-progress-v1';

export interface ChampionshipRaceResult {
  stage: number;
  trackId: string;
  difficulty: Difficulty;
  playerPlace: number;
  standings: Array<{ name: string; place: number; points: number; isPlayer: boolean }>;
}

export interface ChampionshipProgress {
  version: 1;
  cupId: 'summer';
  currentStage: number;
  completed: boolean;
  characterId: string | null;
  difficulty: Difficulty | null;
  results: ChampionshipRaceResult[];
  totals: Record<string, number>;
}

function fresh(): ChampionshipProgress {
  return {
    version: 1,
    cupId: 'summer',
    currentStage: 0,
    completed: false,
    characterId: null,
    difficulty: null,
    results: [],
    totals: {},
  };
}

export function loadChampionship(): ChampionshipProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as ChampionshipProgress;
    if (!data || data.version !== 1 || data.cupId !== 'summer') return fresh();
    data.currentStage = Math.max(0, Math.min(SUMMER_TRACKS.length - 1, Number(data.currentStage) || 0));
    data.results = Array.isArray(data.results) ? data.results : [];
    data.totals = data.totals ?? {};
    data.completed = !!data.completed;
    return data;
  } catch {
    return fresh();
  }
}

export function saveChampionship(data: ChampionshipProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem('rc-summer-unlocked-stage', String(Math.min(SUMMER_TRACKS.length - 1, data.currentStage)));
  } catch {
    /* ignore storage errors */
  }
}

export function championshipPoints(place: number): number {
  return CHAMPIONSHIP_POINTS[Math.max(0, Math.min(7, place - 1))] ?? 1;
}

export function isStageCompleted(stage: number): boolean {
  return loadChampionship().results.some((r) => r.stage === stage);
}

export function availableStage(): number {
  const p = loadChampionship();
  return p.completed ? SUMMER_TRACKS.length - 1 : p.currentStage;
}

export function beginChampionshipStage(stage: number): boolean {
  const p = loadChampionship();
  const target = Math.max(0, Math.min(SUMMER_TRACKS.length - 1, stage));
  if (p.completed || target !== p.currentStage || isStageCompleted(target)) return false;
  sessionStorage.setItem('rc-championship', 'summer');
  sessionStorage.setItem('rc-summer-race', String(target));
  document.body.classList.add('rc-summer-active');
  return true;
}

export function recordChampionshipRace(
  standings: readonly RaceStanding[],
  settings: RaceSettings,
): ChampionshipProgress {
  if (sessionStorage.getItem('rc-championship') !== 'summer') return loadChampionship();
  const stage = Math.max(0, Math.min(SUMMER_TRACKS.length - 1, Number(sessionStorage.getItem('rc-summer-race') ?? '0')));
  const p = loadChampionship();

  if (!p.results.some((r) => r.stage === stage)) {
    const result: ChampionshipRaceResult = {
      stage,
      trackId: settings.trackId,
      difficulty: settings.difficulty,
      playerPlace: standings.find((s) => s.isPlayer)?.place ?? 8,
      standings: standings.map((s) => ({
        name: s.name,
        place: s.place,
        points: championshipPoints(s.place),
        isPlayer: s.isPlayer,
      })),
    };
    p.results.push(result);
    for (const s of result.standings) p.totals[s.name] = (p.totals[s.name] ?? 0) + s.points;
  }

  p.characterId = settings.characterId;
  p.difficulty = settings.difficulty;
  if (stage >= SUMMER_TRACKS.length - 1) {
    p.completed = true;
    p.currentStage = SUMMER_TRACKS.length - 1;
  } else {
    p.currentStage = Math.max(p.currentStage, stage + 1);
  }
  saveChampionship(p);
  return p;
}

export function nextChampionshipSettings(current: RaceSettings): RaceSettings | null {
  const p = loadChampionship();
  if (p.completed || p.currentStage >= SUMMER_TRACKS.length) return null;
  const trackId = SUMMER_TRACKS[p.currentStage];
  if (!trackId) return null;
  sessionStorage.setItem('rc-championship', 'summer');
  sessionStorage.setItem('rc-summer-race', String(p.currentStage));
  document.body.classList.add('rc-summer-active');
  return {
    ...current,
    characterId: p.characterId ?? current.characterId,
    difficulty: p.difficulty ?? current.difficulty,
    trackId,
  };
}

export function leaveChampionship(): void {
  sessionStorage.removeItem('rc-championship');
  sessionStorage.removeItem('rc-summer-race');
  document.body.classList.remove('rc-summer-active');
}

export function championshipTotals(): Array<{ name: string; points: number }> {
  return Object.entries(loadChampionship().totals)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
