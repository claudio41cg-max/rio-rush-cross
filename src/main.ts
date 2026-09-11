/**
 * Bootstrap: WebGL2 detection, global error handling, then hand over to Game.
 */
import './mobile-overrides.css';
import './progress.css';
import './championship-preview.css';
import './results-upgrade.css';
import './webgl-recovery.css';
import { GAME_TITLE } from './core/constants';
import { events } from './core/events';
import { CHAMPIONSHIP_DIFFICULTIES, championshipDifficultyStatus } from './core/championship';
import { getProgress, saveProgress } from './core/progress';
import { Game } from './game/Game';
import { el } from './ui/dom';
import { showToast } from './ui/toast';
import { installChampionshipPreview } from './ui/ChampionshipPreview';
import { installWebGLRecovery } from './ui/WebGLRecovery';

let activeGame: Game | null = null;

const SUMMER_PROGRESS_TRACK_IDS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;

type RuntimeAudio = {
  muted: boolean;
  setMuted(muted: boolean): void;
  stopMusic(): void;
  playMusic(track: 'menu' | 'race' | 'finalLap' | 'results' | 'none'): void;
  update(dt: number, karts: readonly never[], playerKartId: number, camera: unknown): void;
};

type RuntimeGameInternals = {
  audio?: RuntimeAudio;
  camera?: unknown;
  currentMusic?: 'menu' | 'race' | 'finalLap' | 'results' | 'none';
  simulate?: (dt: number, input: unknown) => void;
};

function runtimeInternals(game: Game | null = activeGame): RuntimeGameInternals | null {
  return game ? game as unknown as RuntimeGameInternals : null;
}

function grantEarnedSummerTracks(stage: number): void {
  const safeStage = Math.max(0, Math.min(SUMMER_PROGRESS_TRACK_IDS.length - 1, Math.floor(stage)));
  const highestEarned = Math.min(SUMMER_PROGRESS_TRACK_IDS.length - 1, safeStage + 1);
  const progress = getProgress();
  let changed = false;
  for (let i = 0; i <= highestEarned; i++) {
    const trackId = SUMMER_PROGRESS_TRACK_IDS[i];
    if (!progress.unlockedTracks.includes(trackId)) {
      progress.unlockedTracks.push(trackId);
      changed = true;
    }
  }
  if (changed) saveProgress(progress);
}

function migrateEarnedSummerTracksFromChampionship(): void {
  for (const difficulty of CHAMPIONSHIP_DIFFICULTIES) {
    const status = championshipDifficultyStatus(difficulty);
    if (status.cleared || status.completed) {
      grantEarnedSummerTracks(SUMMER_PROGRESS_TRACK_IDS.length - 1);
      return;
    }
    if (status.racesDone > 0) {
      grantEarnedSummerTracks(Math.max(0, status.currentStage - 1));
    }
  }
}

function stopLiveRaceEngines(): void {
  const runtime = runtimeInternals();
  if (!runtime?.audio || !runtime.camera) return;
  try {
    runtime.audio.update(0, [], -1, runtime.camera);
  } catch (err) {
    console.warn('[RC Rush] Não foi possível encerrar os motores da corrida', err);
  }
}

function freezeSimulationOnResults(game: Game): void {
  const runtime = runtimeInternals(game);
  if (!runtime?.simulate) return;
  const originalSimulate = runtime.simulate.bind(game);
  runtime.simulate = (dt: number, input: unknown): void => {
    if (game.currentState === 'results') return;
    originalSimulate(dt, input);
  };
}

let backgroundAudioPaused = false;
let backgroundWasMuted = false;
let backgroundTrack: 'menu' | 'race' | 'finalLap' | 'results' | 'none' = 'none';

function suspendGameAudio(): void {
  if (backgroundAudioPaused) return;
  const runtime = runtimeInternals();
  const audio = runtime?.audio;
  if (!runtime || !audio) return;
  backgroundAudioPaused = true;
  backgroundWasMuted = audio.muted;
  backgroundTrack = runtime.currentMusic ?? 'none';
  if (!backgroundWasMuted) audio.setMuted(true);
  audio.stopMusic();
  stopLiveRaceEngines();
}

function resumeGameAudio(): void {
  if (!backgroundAudioPaused || document.hidden) return;
  const runtime = runtimeInternals();
  const audio = runtime?.audio;
  backgroundAudioPaused = false;
  if (!runtime || !audio) return;
  if (!backgroundWasMuted) {
    audio.setMuted(false);
    if (backgroundTrack !== 'none') audio.playMusic(backgroundTrack);
  }
  backgroundTrack = 'none';
}

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    return gl instanceof WebGL2RenderingContext;
  } catch {
    return false;
  }
}

function showFatal(root: HTMLElement, title: string, body: string): void {
  root.replaceChildren();
  const wrap = el('div', 'fatal', undefined, root);
  const panel = el('div', 'glass panel fatal-panel', undefined, wrap);
  el('div', 'panel-kicker', GAME_TITLE, panel);
  el('h2', 'panel-title', title, panel);
  el('p', 'fatal-body', body, panel);
  const retry = el('button', 'btn primary', 'RECARREGAR', panel);
  retry.type = 'button';
  retry.addEventListener('click', () => window.location.reload());
}

function boot(): void {
  const app = document.getElementById('app') ?? el('div', '', undefined, document.body);
  app.id = 'app';

  if (!hasWebGL2()) {
    showFatal(
      app,
      'WEBGL2 NECESSÁRIO',
      'RC Rush precisa de um navegador com WebGL 2 e aceleração gráfica ativada. ' +
        'Use uma versão atual do Chrome, Edge, Firefox ou Safari.',
    );
    return;
  }

  let errorToasts = 0;
  const report = (message: string, err: unknown): void => {
    console.error(message, err);
    if (errorToasts < 3) {
      errorToasts++;
      showToast(message, 'error');
    }
  };
  window.addEventListener('error', (ev) => {
    report(`Erro do jogo: ${ev.message || 'desconhecido'}`, ev.error);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason instanceof Error ? ev.reason.message : String(ev.reason);
    report(`Erro ao carregar: ${reason}`, ev.reason);
  });

  try {
    migrateEarnedSummerTracksFromChampionship();
    const game = new Game(app);
    activeGame = game;
    freezeSimulationOnResults(game);
    installWebGLRecovery();
    game.start();
    installChampionshipPreview();
    (window as unknown as { __turboKartRush?: Game }).__turboKartRush = game;
  } catch (err) {
    console.error('[main] failed to start game', err);
    showFatal(app, 'FALHA AO INICIAR', 'Algo deu errado ao iniciar o jogo. Recarregue a página e tente novamente.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

events.on('game:stateChange', ({ to }) => {
  if (to !== 'results') return;
  stopLiveRaceEngines();
  if (sessionStorage.getItem('rc-championship') === 'summer') {
    const stage = Number(sessionStorage.getItem('rc-summer-race') ?? '0');
    grantEarnedSummerTracks(stage);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspendGameAudio();
  else resumeGameAudio();
});
window.addEventListener('pagehide', suspendGameAudio);
window.addEventListener('pageshow', resumeGameAudio);

// Controles de celular: só aparecem quando a corrida começa.
const mobile = document.createElement('div');
mobile.id = 'rio-mobile-controls';
mobile.innerHTML = `
  <button id="rio-left" class="rio-pad rio-drive"><span class="rio-icon">◀</span><span class="rio-label">ESQ</span></button>
  <button id="rio-right" class="rio-pad rio-drive"><span class="rio-icon">▶</span><span class="rio-label">DIR</span></button>
  <button id="rio-drift" class="rio-pad rio-drift"><span class="rio-icon">↻</span><span class="rio-label">DRIFT</span></button>
  <button id="rio-item" class="rio-pad rio-item"><span class="rio-icon">★</span><span class="rio-label">ITEM</span></button>
  <button id="rio-brake" class="rio-pad rio-drive"><span class="rio-icon">▼</span><span class="rio-label">FREIO</span></button>
  <button id="rio-gas" class="rio-pad rio-drive"><span class="rio-icon">▲</span><span class="rio-label">GAS</span></button>
  <button id="rio-tilt" class="rio-tilt" type="button">INCLINAR: OFF</button>`;
document.body.appendChild(mobile);

function getVirtualInput(): { setVirtualKey(code: string, active: boolean): void } | null {
  if (!activeGame) return null;
  const gameWithInput = activeGame as unknown as {
    inputManager?: { setVirtualKey(code: string, active: boolean): void };
    input?: { setVirtualKey(code: string, active: boolean): void };
  };
  return gameWithInput.inputManager ?? gameWithInput.input ?? null;
}

function haptic(ms = 12): void {
  try { if (typeof navigator.vibrate === 'function') navigator.vibrate(ms); } catch { /* ignore */ }
}

function setVirtualControl(code: string, active: boolean): void {
  getVirtualInput()?.setVirtualKey(code, active);
}

const SUMMER_TRACK_NAMES = new Set(['PRAIA AO MEIO-DIA', 'ORLA DO PÔR DO SOL', 'COSTA TROPICAL']);

function isSummerChampionship(): boolean {
  return sessionStorage.getItem('rc-championship') === 'summer';
}

function syncSummerTrackVisibility(): void {
  const panel = document.querySelector<HTMLElement>('.panel-tracks');
  if (!panel) return;
  const summer = isSummerChampionship();
  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.track-card'));
  for (const card of cards) {
    const name = card.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase() ?? '';
    const allowed = SUMMER_TRACK_NAMES.has(name);
    card.hidden = summer && !allowed;
    card.style.display = summer && !allowed ? 'none' : '';
  }
  const title = panel.querySelector<HTMLElement>('.panel-title');
  if (title) title.textContent = summer ? 'COPA VERÃO · ESCOLHA A CORRIDA' : 'ESCOLHA UM CIRCUITO';
}

function syncPermanentSummerStages(): void {
  const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.rc-summer-track'));
  if (items.length === 0) return;
  const unlocked = getProgress().unlockedTracks;
  items.forEach((item, index) => {
    const trackId = SUMMER_PROGRESS_TRACK_IDS[index];
    if (!trackId) return;
    const permanent = unlocked.includes(trackId);
    const currentOrCompleted = item.classList.contains('current') || item.classList.contains('completed');
    item.classList.toggle('conquered', permanent && !currentOrCompleted);
    if (permanent && item.classList.contains('locked')) item.classList.remove('locked');
    const status = item.querySelector<HTMLElement>('.rc-stage-status');
    if (permanent && !currentOrCompleted && status?.textContent?.includes('BLOQUEADA')) {
      status.textContent = '✓ CONQUISTADA';
    }
  });
}

function syncMobileControls(): void {
  const state = activeGame?.currentState;
  const raceActive = state === 'countdown' || state === 'racing';
  mobile.classList.toggle('race-active', raceActive);
  if (!raceActive) releaseTiltDirection();
  syncSummerTrackVisibility();
  syncPermanentSummerStages();
  requestAnimationFrame(syncMobileControls);
}
requestAnimationFrame(syncMobileControls);

const keyMap: Record<string,string> = {
  'rio-left':'ArrowLeft',
  'rio-right':'ArrowRight',
  'rio-brake':'ArrowDown',
  'rio-gas':'ArrowUp',
  'rio-item':'KeyE',
  'rio-drift':'Space',
};
for (const [id,code] of Object.entries(keyMap)) {
  const control = document.getElementById(id)!;
  control.addEventListener('pointerdown', e => {
    e.preventDefault();
    control.setPointerCapture?.(e.pointerId);
    setVirtualControl(code, true);
    if (id === 'rio-item' || id === 'rio-drift') haptic(18);
    else if (id === 'rio-gas') haptic(8);
  });
  for (const ev of ['pointerup','pointercancel','pointerleave']) {
    control.addEventListener(ev, e => {
      e.preventDefault();
      setVirtualControl(code, false);
    });
  }
}

// Direção por inclinação: opcional e independente dos botões de toque.
const tiltButton = document.getElementById('rio-tilt') as HTMLButtonElement;
let tiltEnabled = false;
let tiltBaseline: number | null = null;
let tiltDirection = 0;

function setTiltKey(direction: number, active: boolean): void {
  if (direction === 0) return;
  setVirtualControl(direction < 0 ? 'ArrowLeft' : 'ArrowRight', active);
}

function releaseTiltDirection(): void {
  if (tiltDirection !== 0) setTiltKey(tiltDirection, false);
  tiltDirection = 0;
}

function setTiltDirection(next: number): void {
  if (next === tiltDirection) return;
  releaseTiltDirection();
  tiltDirection = next;
  if (tiltDirection !== 0) setTiltKey(tiltDirection, true);
}

async function enableTilt(): Promise<void> {
  const ctor = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof ctor.requestPermission === 'function') {
    const result = await ctor.requestPermission();
    if (result !== 'granted') throw new Error('Permissão de movimento negada');
  }
  tiltEnabled = true;
  tiltBaseline = null;
  tiltButton.classList.add('active');
  tiltButton.textContent = 'INCLINAR: ON';
}

function disableTilt(): void {
  tiltEnabled = false;
  tiltBaseline = null;
  releaseTiltDirection();
  tiltButton.classList.remove('active');
  tiltButton.textContent = 'INCLINAR: OFF';
}

tiltButton.addEventListener('click', async (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (tiltEnabled) {
    disableTilt();
    return;
  }
  try {
    await enableTilt();
  } catch (err) {
    console.warn('[RC Rush] Inclinação indisponível', err);
    showToast('Não foi possível ativar a direção por inclinação neste aparelho.', 'error');
    disableTilt();
  }
});

window.addEventListener('deviceorientation', (event) => {
  if (!tiltEnabled || !mobile.classList.contains('race-active')) return;
  const angle = screen.orientation?.angle ?? 0;
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;
  let raw = gamma;
  if (angle === 90) raw = beta;
  else if (angle === 270) raw = -beta;

  if (tiltBaseline === null) {
    tiltBaseline = raw;
    return;
  }

  // Invert the sensor delta so tilting the phone right steers right and left steers left in landscape mode.
  const delta = tiltBaseline - raw;
  const deadZone = 6;
  if (delta > deadZone) setTiltDirection(1);
  else if (delta < -deadZone) setTiltDirection(-1);
  else setTiltDirection(0);
}, { passive: true });
