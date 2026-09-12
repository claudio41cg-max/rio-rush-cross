import type { Difficulty } from './core/types';
import { events } from './core/events';
import { getActiveDifficulty, loadChampionship, SUMMER_TRACKS } from './core/championship';
import { Kart } from './kart/Kart';

type AudioRuntime = {
  update?: (dt: number, karts: readonly unknown[], playerKartId: number, camera: unknown) => void;
  stopMusic?: () => void;
  playMusic?: (track: 'menu' | 'race' | 'finalLap' | 'results' | 'none') => void;
  ctx?: AudioContext | null;
  sfxBus?: GainNode | null;
  crowd?: { cheerBurst(strength: number): void } | null;
};

type MenuTrack = { id?: string };

type MenuRuntime = {
  currentPanel?: 'title' | 'characterSelect' | 'trackSelect';
  tracks?: MenuTrack[];
  setTrack?: (index: number, sound?: boolean) => void;
  setDifficulty?: (index: number, sound?: boolean) => void;
  goTo?: (panel: 'title' | 'characterSelect' | 'trackSelect', sound: boolean) => void;
  start?: () => void;
};

type GameRuntime = {
  currentState?: string;
  mainMenu?: MenuRuntime;
  audio?: AudioRuntime;
};

function game(): GameRuntime | null {
  return ((window as unknown as { __turboKartRush?: GameRuntime }).__turboKartRush) ?? null;
}

function isOfficialSummerStageReady(): boolean {
  return sessionStorage.getItem('rc-championship') === 'summer' &&
    sessionStorage.getItem('rc-summer-race') !== null;
}

function difficultyIndex(value: string | null): number {
  return value === 'easy' ? 0 : value === 'hard' ? 2 : 1;
}

const SPEED_MULTIPLIER = 1.08;
let speedPatched = false;
function installKartSpeedBump(): void {
  if (speedPatched) return;
  const proto = Kart.prototype as unknown as { topSpeed: () => number };
  const originalTopSpeed = proto.topSpeed;
  if (typeof originalTopSpeed !== 'function') return;
  proto.topSpeed = function patchedTopSpeed(this: Kart): number {
    return originalTopSpeed.call(this) * SPEED_MULTIPLIER;
  };
  speedPatched = true;
}
installKartSpeedBump();

function installResultAudioGuard(): void {
  const g = game();
  const audio = g?.audio;
  if (!g || !audio?.update || !audio.playMusic || !audio.stopMusic) {
    window.setTimeout(installResultAudioGuard, 80);
    return;
  }

  const originalUpdate = audio.update.bind(audio);
  const originalPlayMusic = audio.playMusic.bind(audio);

  audio.update = (dt, karts, playerKartId, camera) => {
    if (g.currentState === 'results') {
      originalUpdate(0.1, [], -1, camera);
      return;
    }
    originalUpdate(dt, karts, playerKartId, camera);
  };

  audio.playMusic = (track) => {
    if (g.currentState === 'results' && track === 'results') {
      audio.stopMusic?.();
      return;
    }
    originalPlayMusic(track);
  };
}
installResultAudioGuard();

function scheduleClap(ctx: AudioContext, dest: AudioNode, when: number, gain: number): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * 0.075));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1650 + Math.random() * 700;
  filter.Q.value = 0.8;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), when + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(dest);
  source.start(when);
  source.stop(when + 0.09);
}

function playVictoryCelebration(strength = 1): void {
  const audio = game()?.audio;
  const ctx = audio?.ctx;
  const dest = audio?.sfxBus;
  if (!ctx || !dest || ctx.state !== 'running') return;

  audio?.crowd?.cheerBurst(1);
  const start = ctx.currentTime + 0.03;
  for (let i = 0; i < 18; i++) {
    const jitter = (Math.random() - 0.5) * 0.045;
    scheduleClap(ctx, dest, start + i * 0.105 + jitter, 0.12 * strength * (0.8 + Math.random() * 0.4));
  }

  const duration = 2.4;
  const frames = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < frames; i++) {
    brown = brown * 0.985 + (Math.random() * 2 - 1) * 0.08;
    data[i] = Math.max(-1, Math.min(1, brown));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 720;
  filter.Q.value = 0.45;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(0.16 * strength, start + 0.18);
  amp.gain.setValueAtTime(0.14 * strength, start + 1.55);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(dest);
  source.start(start);
  source.stop(start + duration + 0.05);
}

events.on('race:finish', (event) => {
  if (event.isPlayer && event.place === 1) playVictoryCelebration(1);
});

let championCelebrated = false;
function syncChampionCelebration(): void {
  const champion = document.querySelector<HTMLElement>('.champ-final-view.results-win');
  if (champion && !championCelebrated) {
    championCelebrated = true;
    playVictoryCelebration(1.25);
    const sub = champion.querySelector<HTMLElement>('.results-sub');
    if (sub && !sub.textContent?.includes('Parabéns')) sub.textContent = `Parabéns, campeão! ${sub.textContent ?? ''}`.trim();
  } else if (!champion) {
    championCelebrated = false;
  }
  requestAnimationFrame(syncChampionCelebration);
}
requestAnimationFrame(syncChampionCelebration);

let flowPatched = false;
function installChampionshipOneFlow(): void {
  if (flowPatched) return;
  const menu = game()?.mainMenu;
  if (!menu?.goTo || !menu.start) {
    window.setTimeout(installChampionshipOneFlow, 80);
    return;
  }

  const originalGoTo = menu.goTo.bind(menu);
  const startSelectedRace = menu.start.bind(menu);

  menu.goTo = (panel, sound) => {
    if (
      panel === 'trackSelect' &&
      menu.currentPanel === 'characterSelect' &&
      (isOfficialSummerStageReady() || sessionStorage.getItem('rc-summer-practice') === '1')
    ) {
      if (sessionStorage.getItem('rc-summer-practice') === '1') sessionStorage.removeItem('rc-summer-practice');
      startSelectedRace();
      return;
    }
    originalGoTo(panel, sound);
  };

  flowPatched = true;
}
installChampionshipOneFlow();

const DIFFICULTY_UNLOCK_KEY = 'rc-summer-unlocked-by-difficulty-v1';
type DifficultyUnlocks = Record<Difficulty, number>;

function defaultDifficultyUnlocks(): DifficultyUnlocks {
  return { easy: 0, normal: 0, hard: 0 };
}

function inferredUnlockedStage(difficulty: Difficulty): number {
  const cup = loadChampionship(difficulty);
  if (cup.cleared || cup.completed) return 2;
  let unlocked = 0;
  for (const result of cup.results) unlocked = Math.max(unlocked, Math.min(2, result.stage + 1));
  unlocked = Math.max(unlocked, Math.min(2, cup.currentStage));
  return unlocked;
}

function loadDifficultyUnlocks(): DifficultyUnlocks {
  const base = defaultDifficultyUnlocks();
  try {
    const raw = localStorage.getItem(DIFFICULTY_UNLOCK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DifficultyUnlocks>;
      for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
        const value = Number(parsed[difficulty]);
        if (Number.isFinite(value)) base[difficulty] = Math.max(0, Math.min(2, Math.floor(value)));
      }
    }
  } catch {
    // Keep safe defaults.
  }

  let changed = false;
  for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
    const inferred = inferredUnlockedStage(difficulty);
    if (inferred > base[difficulty]) {
      base[difficulty] = inferred;
      changed = true;
    }
  }
  if (changed) {
    try { localStorage.setItem(DIFFICULTY_UNLOCK_KEY, JSON.stringify(base)); } catch { /* ignore */ }
  }
  return base;
}

function permanentTrackUnlocked(index: number): boolean {
  const difficulty = getActiveDifficulty() ?? 'easy';
  return index <= loadDifficultyUnlocks()[difficulty];
}

function openConqueredTrack(index: number): void {
  const g = game();
  const menu = g?.mainMenu;
  const trackId = SUMMER_TRACKS[index];
  if (!menu || !trackId || !permanentTrackUnlocked(index)) return;

  const runtimeIndex = menu.tracks?.findIndex((track) => track.id === trackId) ?? -1;
  if (runtimeIndex < 0) return;

  const difficulty = getActiveDifficulty() ?? 'easy';
  sessionStorage.setItem('rc-summer-practice', '1');
  sessionStorage.removeItem('rc-championship');
  sessionStorage.removeItem('rc-summer-race');
  document.body.classList.remove('rc-summer-active');
  delete document.body.dataset.rcSummerStage;

  menu.setTrack?.(runtimeIndex, false);
  menu.setDifficulty?.(difficultyIndex(difficulty), false);
  menu.goTo?.('characterSelect', true);
}

function syncConqueredCards(): void {
  const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.rc-summer-track'));
  if (cards.length > 0) {
    cards.forEach((card, index) => {
      if (!permanentTrackUnlocked(index)) return;
      const current = card.classList.contains('current');
      const completed = card.classList.contains('completed');
      if (!current && !completed) {
        card.disabled = false;
        card.classList.remove('locked');
        card.classList.add('conquered');
        card.setAttribute('aria-disabled', 'false');
        const status = card.querySelector<HTMLElement>('.rc-stage-status');
        if (status) status.textContent = '✓ LIBERADA · JOGAR';
      }
    });
  }
  requestAnimationFrame(syncConqueredCards);
}
requestAnimationFrame(syncConqueredCards);

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const card = target?.closest<HTMLButtonElement>('.rc-summer-track.conquered');
  if (!card) return;

  const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.rc-summer-track'));
  const index = cards.indexOf(card);
  if (index < 0 || !permanentTrackUnlocked(index)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  openConqueredTrack(index);
}, true);

const DRIVER_NAMES: Record<string, string> = {
  VERMELHO: 'Lucas',
  AZUL: 'Mateo',
  VERDE: 'Ethan',
  AMARELO: 'Sofia',
  LARANJA: 'Noah',
  ROXO: 'Kenji',
  BRANCO: 'Enzo',
  PRETO: 'Mila',
};

const DRIVER_FLAGS: Record<string, string> = {
  'CLÁUDIO': '🇧🇷',
  LUCAS: '🇧🇷',
  MATEO: '🇦🇷',
  ETHAN: '🇺🇸',
  SOFIA: '🇪🇸',
  NOAH: '🇬🇧',
  KENJI: '🇯🇵',
  ENZO: '🇮🇹',
  MILA: '🇩🇪',
};

function syncDriverNamesAndVictoryCopy(): void {
  const names = document.querySelectorAll<HTMLElement>('.standing-name, .champ-pilot');
  names.forEach((node) => {
    const text = (node.textContent ?? '').trim();
    if (!text) return;
    if (text.includes('(VOCÊ)')) {
      node.textContent = 'CLÁUDIO (VOCÊ)';
    } else {
      const upper = text.toUpperCase();
      for (const [colour, driver] of Object.entries(DRIVER_NAMES)) {
        if (upper === colour || upper.startsWith(`${colour} `)) {
          node.textContent = driver;
          break;
        }
      }
    }

    // Free-race results used a coloured square beside each pilot. Replace that
    // internal kart-colour marker with the pilot's country flag so the screen
    // reads as people/characters instead of colour-coded cars.
    const row = node.closest<HTMLElement>('.standing-row');
    const chip = row?.querySelector<HTMLElement>('.standing-chip');
    if (chip) {
      const driverKey = (node.textContent ?? '').replace('(VOCÊ)', '').trim().toUpperCase();
      chip.textContent = DRIVER_FLAGS[driverKey] ?? '🏁';
      chip.style.background = 'transparent';
      chip.style.width = '22px';
      chip.style.height = '18px';
      chip.style.borderRadius = '0';
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.justifyContent = 'center';
      chip.style.fontSize = '16px';
      chip.style.lineHeight = '1';
    }
  });

  const result = document.querySelector<HTMLElement>('.results.champ-race-view.results-victory .results-sub');
  if (result && !result.textContent?.includes('Parabéns')) result.textContent = 'Parabéns! Você venceu esta etapa!';

  requestAnimationFrame(syncDriverNamesAndVictoryCopy);
}
requestAnimationFrame(syncDriverNamesAndVictoryCopy);
