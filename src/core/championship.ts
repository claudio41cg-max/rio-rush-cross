import type { Difficulty, RaceStanding, RaceSettings } from './types';

export const SUMMER_TRACKS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;
export const CHAMPIONSHIP_POINTS = [10, 8, 6, 5, 4, 3, 2, 1] as const;
export const CHAMPIONSHIP_DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
export const CHAMPIONSHIP_STAGES_TOTAL = SUMMER_TRACKS.length;

const STORAGE_KEY = 'rc-championship-progress-v2';
const SESSION_DIFFICULTY_KEY = 'rc-championship-difficulty';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'FÁCIL',
  normal: 'MÉDIO',
  hard: 'DIFÍCIL',
};

export const DIFFICULTY_COIN_LABEL: Record<Difficulty, string> = {
  easy: 'MOEDAS PADRÃO',
  normal: 'MAIS MOEDAS',
  hard: 'MÁXIMO DE MOEDAS',
};

export interface ChampionshipStandingLine {
  key: string;
  rawName: string;
  pilotName: string;
  country: string;
  countryCode: string;
  place: number;
  points: number;
  isPlayer: boolean;
}

export interface ChampionshipRaceResult {
  stage: number;
  trackId: string;
  difficulty: Difficulty;
  playerPlace: number;
  standings: ChampionshipStandingLine[];
}

export interface ChampionshipRun {
  difficulty: Difficulty;
  currentStage: number;
  completed: boolean;
  /** True once the player has won this difficulty at least once. */
  cleared: boolean;
  characterId: string | null;
  results: ChampionshipRaceResult[];
  totals: Record<string, number>;
}

export interface ChampionshipSave {
  version: 2;
  cupId: 'summer';
  activeDifficulty: Difficulty | null;
  runs: Record<Difficulty, ChampionshipRun>;
}

export interface ChampionshipLeaderboardRow {
  key: string;
  pilotName: string;
  country: string;
  countryCode: string;
  points: number;
  wins: number;
  averagePlace: number;
  lastPlace: number;
  isPlayer: boolean;
}

const PILOTS: Record<string, { name: string; country: string; code: string }> = {
  vermelho: { name: 'Lucas', country: '🇧🇷', code: 'BR' },
  azul: { name: 'Mateo', country: '🇦🇷', code: 'AR' },
  verde: { name: 'Ethan', country: '🇺🇸', code: 'US' },
  amarelo: { name: 'Sofia', country: '🇪🇸', code: 'ES' },
  laranja: { name: 'Noah', country: '🇬🇧', code: 'GB' },
  roxo: { name: 'Kenji', country: '🇯🇵', code: 'JP' },
  branco: { name: 'Enzo', country: '🇮🇹', code: 'IT' },
  preto: { name: 'Mila', country: '🇩🇪', code: 'DE' },
};

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function freshRun(difficulty: Difficulty, cleared = false): ChampionshipRun {
  return {
    difficulty,
    currentStage: 0,
    completed: false,
    cleared,
    characterId: null,
    results: [],
    totals: {},
  };
}

function freshSave(): ChampionshipSave {
  return {
    version: 2,
    cupId: 'summer',
    activeDifficulty: null,
    runs: {
      easy: freshRun('easy'),
      normal: freshRun('normal'),
      hard: freshRun('hard'),
    },
  };
}

function sanitizeRun(value: Partial<ChampionshipRun> | undefined, difficulty: Difficulty): ChampionshipRun {
  const run = freshRun(difficulty, !!value?.cleared);
  run.currentStage = Math.max(0, Math.min(CHAMPIONSHIP_STAGES_TOTAL - 1, Number(value?.currentStage) || 0));
  run.completed = !!value?.completed;
  run.characterId = typeof value?.characterId === 'string' ? value.characterId : null;
  run.results = Array.isArray(value?.results) ? value.results as ChampionshipRaceResult[] : [];
  run.totals = value?.totals && typeof value.totals === 'object' ? value.totals as Record<string, number> : {};
  return run;
}

export function loadChampionshipSave(): ChampionshipSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw) as Partial<ChampionshipSave>;
    if (!data || data.version !== 2 || data.cupId !== 'summer') return freshSave();
    const active = CHAMPIONSHIP_DIFFICULTIES.includes(data.activeDifficulty as Difficulty)
      ? data.activeDifficulty as Difficulty
      : null;
    return {
      version: 2,
      cupId: 'summer',
      activeDifficulty: active,
      runs: {
        easy: sanitizeRun(data.runs?.easy, 'easy'),
        normal: sanitizeRun(data.runs?.normal, 'normal'),
        hard: sanitizeRun(data.runs?.hard, 'hard'),
      },
    };
  } catch {
    return freshSave();
  }
}

export function saveChampionshipSave(data: ChampionshipSave): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const active = data.activeDifficulty;
    if (active) {
      const run = data.runs[active];
      localStorage.setItem('rc-summer-unlocked-stage', String(Math.min(CHAMPIONSHIP_STAGES_TOTAL - 1, run.currentStage)));
    }
  } catch {
    /* storage unavailable */
  }
}

export function getActiveDifficulty(): Difficulty | null {
  const session = sessionStorage.getItem(SESSION_DIFFICULTY_KEY) as Difficulty | null;
  if (session && CHAMPIONSHIP_DIFFICULTIES.includes(session)) return session;
  return loadChampionshipSave().activeDifficulty;
}

export function loadChampionship(difficulty?: Difficulty | null): ChampionshipRun {
  const save = loadChampionshipSave();
  const chosen = difficulty ?? getActiveDifficulty() ?? save.activeDifficulty ?? 'easy';
  return save.runs[chosen];
}

export function championshipPoints(place: number): number {
  return CHAMPIONSHIP_POINTS[Math.max(0, Math.min(7, place - 1))] ?? 1;
}

export function startOrContinueChampionship(difficulty: Difficulty): ChampionshipRun {
  const save = loadChampionshipSave();
  let run = save.runs[difficulty];

  // A finished attempt may be played again, but a previously won trophy is retained.
  if (run.completed) {
    run = freshRun(difficulty, run.cleared);
    save.runs[difficulty] = run;
  }

  save.activeDifficulty = difficulty;
  saveChampionshipSave(save);
  sessionStorage.setItem(SESSION_DIFFICULTY_KEY, difficulty);
  return run;
}

export function championshipDifficultyStatus(difficulty: Difficulty): {
  cleared: boolean;
  completed: boolean;
  currentStage: number;
  racesDone: number;
} {
  const run = loadChampionshipSave().runs[difficulty];
  return {
    cleared: run.cleared,
    completed: run.completed,
    currentStage: run.currentStage,
    racesDone: run.results.length,
  };
}

export function beginChampionshipStage(stage: number): boolean {
  const difficulty = getActiveDifficulty();
  if (!difficulty) return false;
  const save = loadChampionshipSave();
  const run = save.runs[difficulty];
  const target = Math.max(0, Math.min(CHAMPIONSHIP_STAGES_TOTAL - 1, Math.floor(stage)));
  if (run.completed || target !== run.currentStage || run.results.some((r) => r.stage === target)) return false;

  save.activeDifficulty = difficulty;
  saveChampionshipSave(save);
  sessionStorage.setItem('rc-championship', 'summer');
  sessionStorage.setItem('rc-summer-race', String(target));
  sessionStorage.setItem(SESSION_DIFFICULTY_KEY, difficulty);
  document.body.classList.add('rc-summer-active');
  return true;
}

function profileForStanding(standing: RaceStanding): { key: string; name: string; country: string; code: string } {
  if (standing.isPlayer) {
    return { key: 'player', name: 'CLÁUDIO', country: '🇧🇷', code: 'BR' };
  }
  const rawKey = normalizeName(standing.name);
  const profile = PILOTS[rawKey] ?? { name: standing.name, country: '🏁', code: '--' };
  return { key: `ai:${rawKey}`, name: profile.name, country: profile.country, code: profile.code };
}

export function recordChampionshipRace(
  standings: readonly RaceStanding[],
  settings: RaceSettings,
): ChampionshipRun {
  if (sessionStorage.getItem('rc-championship') !== 'summer') return loadChampionship();
  const difficulty = getActiveDifficulty() ?? settings.difficulty;
  const save = loadChampionshipSave();
  const run = save.runs[difficulty];
  const stage = Math.max(
    0,
    Math.min(CHAMPIONSHIP_STAGES_TOTAL - 1, Number(sessionStorage.getItem('rc-summer-race') ?? run.currentStage)),
  );

  if (!run.results.some((r) => r.stage === stage)) {
    const lines: ChampionshipStandingLine[] = standings.map((standing) => {
      const pilot = profileForStanding(standing);
      return {
        key: pilot.key,
        rawName: standing.name,
        pilotName: pilot.name,
        country: pilot.country,
        countryCode: pilot.code,
        place: standing.place,
        points: championshipPoints(standing.place),
        isPlayer: standing.isPlayer,
      };
    });

    const result: ChampionshipRaceResult = {
      stage,
      trackId: settings.trackId,
      difficulty,
      playerPlace: standings.find((s) => s.isPlayer)?.place ?? 8,
      standings: lines,
    };
    run.results.push(result);
    for (const line of lines) {
      run.totals[line.key] = (run.totals[line.key] ?? 0) + line.points;
    }
  }

  run.characterId = run.characterId ?? settings.characterId;
  if (stage >= CHAMPIONSHIP_STAGES_TOTAL - 1) {
    run.completed = true;
    run.currentStage = CHAMPIONSHIP_STAGES_TOTAL - 1;
  } else {
    run.currentStage = Math.max(run.currentStage, stage + 1);
  }

  save.activeDifficulty = difficulty;
  save.runs[difficulty] = run;

  if (run.completed) {
    const finalTable = championshipLeaderboard(run);
    if (finalTable[0]?.isPlayer) run.cleared = true;
  }

  saveChampionshipSave(save);
  return run;
}

export function championshipLeaderboard(run: ChampionshipRun = loadChampionship()): ChampionshipLeaderboardRow[] {
  const identities = new Map<string, { pilotName: string; country: string; countryCode: string; isPlayer: boolean }>();
  const places = new Map<string, number[]>();

  for (const result of run.results) {
    for (const line of result.standings) {
      identities.set(line.key, {
        pilotName: line.pilotName,
        country: line.country,
        countryCode: line.countryCode,
        isPlayer: line.isPlayer,
      });
      const list = places.get(line.key) ?? [];
      list.push(line.place);
      places.set(line.key, list);
    }
  }

  return Array.from(identities.entries())
    .map(([key, identity]) => {
      const allPlaces = places.get(key) ?? [];
      const wins = allPlaces.filter((p) => p === 1).length;
      const averagePlace = allPlaces.length
        ? allPlaces.reduce((sum, value) => sum + value, 0) / allPlaces.length
        : 99;
      const lastPlace = allPlaces[allPlaces.length - 1] ?? 99;
      return {
        key,
        ...identity,
        points: run.totals[key] ?? 0,
        wins,
        averagePlace,
        lastPlace,
      };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.averagePlace - b.averagePlace ||
      a.lastPlace - b.lastPlace ||
      a.pilotName.localeCompare(b.pilotName),
    );
}

export function playerChampionshipRank(run: ChampionshipRun = loadChampionship()): number {
  const table = championshipLeaderboard(run);
  const index = table.findIndex((row) => row.isPlayer);
  return index >= 0 ? index + 1 : 8;
}

export function nextChampionshipSettings(current: RaceSettings): RaceSettings | null {
  const difficulty = getActiveDifficulty() ?? current.difficulty;
  const save = loadChampionshipSave();
  const run = save.runs[difficulty];
  if (run.completed || run.currentStage >= CHAMPIONSHIP_STAGES_TOTAL) return null;
  const trackId = SUMMER_TRACKS[run.currentStage];
  if (!trackId) return null;

  sessionStorage.setItem('rc-championship', 'summer');
  sessionStorage.setItem('rc-summer-race', String(run.currentStage));
  sessionStorage.setItem(SESSION_DIFFICULTY_KEY, difficulty);
  document.body.classList.add('rc-summer-active');

  return {
    ...current,
    characterId: run.characterId ?? current.characterId,
    difficulty,
    trackId,
  };
}

export function leaveChampionship(): void {
  sessionStorage.removeItem('rc-championship');
  sessionStorage.removeItem('rc-summer-race');
  sessionStorage.removeItem(SESSION_DIFFICULTY_KEY);
  document.body.classList.remove('rc-summer-active');
}

export function championshipTotals(): ChampionshipLeaderboardRow[] {
  return championshipLeaderboard(loadChampionship());
}
