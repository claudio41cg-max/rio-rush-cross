/**
 * Persistent player progress (localStorage).
 * Coins, unlocks, stats — works offline and is free.
 */
import { SUMMER_CUP_TRACK_IDS } from '../track/tracks';

export interface ProgressData {
  version: 1;
  coins: number;
  unlockedCharacters: string[];
  unlockedTracks: string[];
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  bestPlace: number;
  /** Best finish time per track id (seconds). */
  bestTimes: Record<string, number>;
  /** Races completed per track. */
  trackRaces: Record<string, number>;
}

const STORAGE_KEY = 'rc-rush-progress-v1';
const SUMMER_CHAMPIONSHIP_TRACKS = SUMMER_CUP_TRACK_IDS;

/** Starting unlocks — first karts and tracks free so the player can race immediately. */
const DEFAULT_CHARACTERS = ['zippy', 'pixel', 'fennec', 'max'];
const DEFAULT_TRACKS = ['sunny_circuit', 'dune_drift', 'coastal_rush', 'summer_beach'];

/** Unlock costs in coins. */
export const CHARACTER_COST: Record<string, number> = {
  zippy: 0,
  pixel: 0,
  fennec: 0,
  max: 0,
  juno: 250,
  kai: 350,
  bram: 450,
  rosa: 600,
};

export const TRACK_COST: Record<string, number> = {
  sunny_circuit: 0,
  dune_drift: 0,
  coastal_rush: 0,
  summer_beach: 0,
  summer_harbor: 280,
  frostbite_falls: 200,
  neon_nexus: 300,
  summer_sunset: 350,
  summer_tropical: 400,
  summer_lighthouse: 450,
};

/** Coins awarded by place (1st … 8th). Multiplied by difficulty. */
const PLACE_REWARD = [120, 80, 55, 35, 22, 14, 8, 5];
const DIFFICULTY_MULT: Record<string, number> = {
  easy: 0.75,
  normal: 1,
  hard: 1.4,
};

function defaultProgress(): ProgressData {
  return {
    version: 1,
    coins: 80,
    unlockedCharacters: [...DEFAULT_CHARACTERS],
    unlockedTracks: [...DEFAULT_TRACKS],
    totalRaces: 0,
    totalWins: 0,
    totalPodiums: 0,
    bestPlace: 8,
    bestTimes: {},
    trackRaces: {},
  };
}

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const data = JSON.parse(raw) as ProgressData;
    if (!data || data.version !== 1) return defaultProgress();
    data.unlockedCharacters = Array.isArray(data.unlockedCharacters) ? data.unlockedCharacters : [...DEFAULT_CHARACTERS];
    data.unlockedTracks = Array.isArray(data.unlockedTracks) ? data.unlockedTracks : [...DEFAULT_TRACKS];
    data.bestTimes = data.bestTimes ?? {};
    data.trackRaces = data.trackRaces ?? {};
    data.coins = Math.max(0, Number(data.coins) || 0);
    return data;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data: ProgressData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

let cache: ProgressData | null = null;
export function getProgress(): ProgressData { if (!cache) cache = loadProgress(); return cache; }
export function refreshProgress(): ProgressData { cache = loadProgress(); return cache; }
function persist(): void { if (cache) saveProgress(cache); }
export function getCoins(): number { return getProgress().coins; }

export function isCharacterUnlocked(id: string): boolean {
  const p = getProgress();
  if (DEFAULT_CHARACTERS.includes(id)) return true;
  return p.unlockedCharacters.includes(id);
}

export function isTrackUnlocked(id: string): boolean {
  if (sessionStorage.getItem('rc-championship') === 'summer') {
    const stage = Math.max(
      0,
      Math.min(SUMMER_CHAMPIONSHIP_TRACKS.length - 1, Number(sessionStorage.getItem('rc-summer-race') ?? '0')),
    );
    if (SUMMER_CHAMPIONSHIP_TRACKS[stage] === id) return true;
  }
  const p = getProgress();
  if (DEFAULT_TRACKS.includes(id)) return true;
  return p.unlockedTracks.includes(id);
}

export function characterUnlockCost(id: string): number { return CHARACTER_COST[id] ?? 400; }
export function trackUnlockCost(id: string): number { return TRACK_COST[id] ?? 300; }
export function canAffordCharacter(id: string): boolean { return getCoins() >= characterUnlockCost(id); }
export function canAffordTrack(id: string): boolean { return getCoins() >= trackUnlockCost(id); }

export function unlockCharacter(id: string): boolean {
  if (isCharacterUnlocked(id)) return true;
  const cost = characterUnlockCost(id); const p = getProgress(); if (p.coins < cost) return false;
  p.coins -= cost; if (!p.unlockedCharacters.includes(id)) p.unlockedCharacters.push(id); persist(); return true;
}

export function unlockTrack(id: string): boolean {
  if (isTrackUnlocked(id)) return true;
  const cost = trackUnlockCost(id); const p = getProgress(); if (p.coins < cost) return false;
  p.coins -= cost; if (!p.unlockedTracks.includes(id)) p.unlockedTracks.push(id); persist(); return true;
}

export interface RaceReward {
  coins: number;
  place: number;
  isWin: boolean;
  isPodium: boolean;
  isNewBest: boolean;
  totalCoins: number;
}

export function awardRace(place: number, difficulty: string, trackId: string, finishTime: number): RaceReward {
  const p = getProgress();
  const placeIdx = Math.max(0, Math.min(7, place - 1));
  const mult = DIFFICULTY_MULT[difficulty] ?? 1;
  const coins = Math.round((PLACE_REWARD[placeIdx] ?? 5) * mult);
  p.coins += coins; p.totalRaces += 1; if (place === 1) p.totalWins += 1; if (place <= 3) p.totalPodiums += 1; if (place < p.bestPlace) p.bestPlace = place;
  p.trackRaces[trackId] = (p.trackRaces[trackId] ?? 0) + 1;
  let isNewBest = false;
  if (Number.isFinite(finishTime) && finishTime > 0) {
    const prev = p.bestTimes[trackId];
    if (prev === undefined || finishTime < prev) { p.bestTimes[trackId] = finishTime; isNewBest = true; }
  }
  persist();
  return { coins, place, isWin: place === 1, isPodium: place <= 3, isNewBest, totalCoins: p.coins };
}

export function addCoins(amount: number): number { const p = getProgress(); p.coins = Math.max(0, p.coins + amount); persist(); return p.coins; }
export function resetProgress(): void { cache = defaultProgress(); persist(); }
