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
      originalUpdate(0, [], -1, camera);
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

  // Pista já conquistada pode ser rejogada sem mexer na tentativa oficial da Copa.
  // Assim o jogador não perde progresso nem duplica pontos do campeonato.
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
