import { getProgress } from './core/progress';
import { getActiveDifficulty, SUMMER_TRACKS } from './core/championship';

type TrackInfo = { id?: string };
type MenuRuntime = {
  tracks?: TrackInfo[];
  setTrack?: (index: number, sound?: boolean) => void;
  setDifficulty?: (index: number, sound?: boolean) => void;
  goTo?: (panel: 'title' | 'characterSelect' | 'trackSelect', sound: boolean) => void;
};
type AudioRuntime = {
  update?: (dt: number, karts: readonly unknown[], playerKartId: number, camera: unknown) => void;
  stopMusic?: () => void;
  playMusic?: (track: 'menu' | 'race' | 'finalLap' | 'results' | 'none') => void;
};
type GameRuntime = {
  currentState?: string;
  mainMenu?: MenuRuntime;
  audio?: AudioRuntime;
  camera?: unknown;
};

function game(): GameRuntime | null {
  return ((window as unknown as { __turboKartRush?: GameRuntime }).__turboKartRush) ?? null;
}

function difficultyIndex(value: string | null): number {
  return value === 'easy' ? 0 : value === 'hard' ? 2 : 1;
}

function silenceResultsAudio(): void {
  const g = game();
  if (!g || g.currentState !== 'results') return;
  try {
    if (g.audio?.update && g.camera) g.audio.update(0, [], -1, g.camera);
    g.audio?.stopMusic?.();
  } catch (err) {
    console.warn('[RC Rush hotfix] falha ao silenciar resultado', err);
  }
}

// Game.ts intentionally keeps rendering the 3D scene behind the result panel.
// That render path also updates engine voices, so keep clearing them while the
// result screen is visible. This does not touch physics or race scoring.
let lastState = '';
function resultAudioGuard(): void {
  const state = game()?.currentState ?? '';
  if (state === 'results') silenceResultsAudio();
  lastState = state;
  requestAnimationFrame(resultAudioGuard);
}
requestAnimationFrame(resultAudioGuard);

function permanentTrackUnlocked(index: number): boolean {
  const id = SUMMER_TRACKS[index];
  return !!id && getProgress().unlockedTracks.includes(id);
}

function openConqueredTrack(index: number): void {
  const g = game();
  const menu = g?.mainMenu;
  const trackId = SUMMER_TRACKS[index];
  if (!menu || !trackId || !permanentTrackUnlocked(index)) return;

  const runtimeIndex = menu.tracks?.findIndex((track) => track.id === trackId) ?? -1;
  if (runtimeIndex < 0) return;

  // A conquered course is permanently playable. Replaying it from this screen
  // is treated as a practice/free race so it cannot duplicate championship
  // points or skip the official current stage.
  sessionStorage.removeItem('rc-championship');
  sessionStorage.removeItem('rc-summer-race');
  document.body.classList.remove('rc-summer-active');
  delete document.body.dataset.rcSummerStage;

  menu.setTrack?.(runtimeIndex, false);
  menu.setDifficulty?.(difficultyIndex(getActiveDifficulty()), false);
  menu.goTo?.('characterSelect', true);
}

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

function enableConqueredCards(): void {
  const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.rc-summer-track'));
  cards.forEach((card, index) => {
    if (!permanentTrackUnlocked(index)) return;
    const currentOrCompleted = card.classList.contains('current') || card.classList.contains('completed');
    if (!currentOrCompleted) {
      card.disabled = false;
      card.classList.remove('locked');
      card.classList.add('conquered');
      card.setAttribute('aria-disabled', 'false');
      const status = card.querySelector<HTMLElement>('.rc-stage-status');
      if (status) status.textContent = '✓ CONQUISTADA · JOGAR';
    }
  });
  requestAnimationFrame(enableConqueredCards);
}
requestAnimationFrame(enableConqueredCards);
