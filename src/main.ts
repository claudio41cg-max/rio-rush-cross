/**
 * Bootstrap: WebGL2 detection, global error handling, then hand over to Game.
 */
import './mobile-overrides.css';
import './championship-preview.css';
import './webgl-recovery.css';
import { GAME_TITLE } from './core/constants';
import { Game } from './game/Game';
import { el } from './ui/dom';
import { showToast } from './ui/toast';
import { installChampionshipPreview } from './ui/ChampionshipPreview';
import { installWebGLRecovery } from './ui/WebGLRecovery';

let activeGame: Game | null = null;

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
    const game = new Game(app);
    activeGame = game;
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

// Controles de celular: só aparecem quando a corrida começa.
const mobile = document.createElement('div');
mobile.id = 'rio-mobile-controls';
mobile.innerHTML = `
  <button id="rio-left" class="rio-pad rio-drive"><span class="rio-icon">◀</span><span class="rio-label">ESQUERDA</span></button>
  <button id="rio-right" class="rio-pad rio-drive"><span class="rio-icon">▶</span><span class="rio-label">DIREITA</span></button>
  <button id="rio-item" class="rio-pad rio-item"><span class="rio-icon">★</span><span class="rio-label">ITEM</span></button>
  <button id="rio-brake" class="rio-pad rio-drive"><span class="rio-icon">▼</span><span class="rio-label">FREIO</span></button>
  <button id="rio-gas" class="rio-pad rio-drive"><span class="rio-icon">▲</span><span class="rio-label">ACELERAR</span></button>
  <button id="rio-tilt" class="rio-tilt" type="button">INCLINAR: OFF</button>`;
document.body.appendChild(mobile);

function getVirtualInput(): { setVirtualKey(code: string, active: boolean): void } | null {
  if (!activeGame) return null;
  const gameWithInput = activeGame as unknown as {
    input?: { setVirtualKey(code: string, active: boolean): void };
  };
  return gameWithInput.input ?? null;
}

function setVirtualControl(code: string, active: boolean): void {
  getVirtualInput()?.setVirtualKey(code, active);
}

function syncMobileControls(): void {
  const state = activeGame?.currentState;
  const raceActive = state === 'countdown' || state === 'racing';
  mobile.classList.toggle('race-active', raceActive);
  if (!raceActive) releaseTiltDirection();
  requestAnimationFrame(syncMobileControls);
}
requestAnimationFrame(syncMobileControls);

const keyMap: Record<string,string> = {
  'rio-left':'ArrowLeft',
  'rio-right':'ArrowRight',
  'rio-brake':'ArrowDown',
  'rio-gas':'ArrowUp',
  'rio-item':'KeyE',
};
for (const [id,code] of Object.entries(keyMap)) {
  const control = document.getElementById(id)!;
  control.addEventListener('pointerdown', e => {
    e.preventDefault();
    control.setPointerCapture?.(e.pointerId);
    setVirtualControl(code, true);
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
