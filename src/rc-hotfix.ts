import { getProgress } from './core/progress';
import { getActiveDifficulty, SUMMER_TRACKS } from './core/championship';

type AudioRuntime = {
  update?: (dt: number, karts: readonly unknown[], playerKartId: number, camera: unknown) => void;
  stopMusic?: () => void;
  playMusic?: (track: 'menu' | 'race' | 'finalLap' | 'results' | 'none') => void;
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

// Copa Verão one-flow: a pista oficial já foi escolhida no painel da Copa.
// Depois de escolher o carrinho, inicia essa corrida diretamente e não abre
// o seletor genérico de pistas de novo.
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
      if (sessionStorage.getItem('rc-summer-practice') === '1') {
        sessionStorage.removeItem('rc-summer-practice');
      }
      startSelectedRace();
      return;
    }
    originalGoTo(panel, sound);
  };

  flowPatched = true;
}
installChampionshipOneFlow();

function permanentTrackUnlocked(index: number): boolean {
  const trackId = SUMMER_TRACKS[index];
  return !!trackId && getProgress().unlockedTracks.includes(trackId);
}

function openConqueredTrack(index: number): void {
  const g = game();
  const menu = g?.mainMenu;
  const trackId = SUMMER_TRACKS[index];
  if (!menu || !trackId || !permanentTrackUnlocked(index)) return;

  const runtimeIndex = menu.tracks?.findIndex((track) => track.id === trackId) ?? -1;
  if (runtimeIndex < 0) return;

  // Mantém intacta a tentativa oficial salva no localStorage. Esta corrida
  // é apenas uma repetição livre de uma pista já conquistada.
  sessionStorage.setItem('rc-summer-practice', '1');
  sessionStorage.removeItem('rc-championship');
  sessionStorage.removeItem('rc-summer-race');
  document.body.classList.remove('rc-summer-active');
  delete document.body.dataset.rcSummerStage;

  menu.setTrack?.(runtimeIndex, false);
  menu.setDifficulty?.(difficultyIndex(getActiveDifficulty()), false);
  menu.goTo?.('characterSelect', true);
}

function syncConqueredCards(): void {
  const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.rc-summer-track'));
  if (cards.length === 0) {
    requestAnimationFrame(syncConqueredCards);
    return;
  }

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
