/**
 * Bootstrap: WebGL2 detection, global error handling, then hand over to Game.
 */
import './mobile-overrides.css';
import { GAME_TITLE } from './core/constants';
import { Game } from './game/Game';
import { el } from './ui/dom';
import { showToast } from './ui/toast';

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
    game.start();
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
  <button id="rio-gas" class="rio-pad rio-drive"><span class="rio-icon">▲</span><span class="rio-label">ACELERAR</span></button>`;
document.body.appendChild(mobile);

function syncMobileControls(): void {
  const state = activeGame?.currentState;
  mobile.classList.toggle('race-active', state === 'countdown' || state === 'racing');
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
for (const [id,key] of Object.entries(keyMap)) {
  const control = document.getElementById(id)!;
  const fire = (type:string) => window.dispatchEvent(new KeyboardEvent(type,{key:key === 'KeyE' ? 'e' : key,code:key,bubbles:true}));
  control.addEventListener('pointerdown', e => { e.preventDefault(); control.setPointerCapture?.(e.pointerId); fire('keydown'); });
  for (const ev of ['pointerup','pointercancel','pointerleave']) control.addEventListener(ev, e => { e.preventDefault(); fire('keyup'); });
}
