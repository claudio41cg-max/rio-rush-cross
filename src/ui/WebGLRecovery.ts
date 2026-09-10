let overlay: HTMLDivElement | null = null;
let reloadTimer = 0;

function getOverlay(): HTMLDivElement {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'rc-webgl-recovery';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.innerHTML = '<div class="rc-webgl-recovery-card"><div class="rc-webgl-spinner"></div><strong>RESTAURANDO O JOGO…</strong><span>A imagem foi interrompida pelo aparelho. Aguarde um instante.</span></div>';
  document.body.appendChild(overlay);
  return overlay;
}

function showRecovery(): void {
  getOverlay().classList.add('visible');
  window.clearTimeout(reloadTimer);
  reloadTimer = window.setTimeout(() => {
    const card = getOverlay().querySelector<HTMLElement>('.rc-webgl-recovery-card');
    if (!card) return;
    card.innerHTML = '<strong>VAMOS RECUPERAR O JOGO</strong><span>Toque abaixo para recarregar com segurança.</span><button type="button" class="rc-webgl-reload">RECARREGAR</button>';
    card.querySelector<HTMLButtonElement>('.rc-webgl-reload')?.addEventListener('click', () => location.reload(), { once: true });
  }, 8000);
}

function hideRecovery(): void {
  window.clearTimeout(reloadTimer);
  overlay?.classList.remove('visible');
}

export function installWebGLRecovery(): void {
  const attach = (canvas: HTMLCanvasElement): void => {
    if (canvas.dataset.rcWebglRecovery === '1') return;
    canvas.dataset.rcWebglRecovery = '1';
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      showRecovery();
    }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      hideRecovery();
      window.dispatchEvent(new Event('resize'));
    }, false);
  };

  document.querySelectorAll<HTMLCanvasElement>('canvas.game-canvas').forEach(attach);
  const observer = new MutationObserver(() => {
    document.querySelectorAll<HTMLCanvasElement>('canvas.game-canvas').forEach(attach);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
