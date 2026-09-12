/* RC Rush — abertura em duas etapas. UI-only; não toca no motor do jogo. */
let installed = false;

function activateIntro(): boolean {
  if (installed) return true;
  const title = document.querySelector<HTMLElement>('.panel-title-screen');
  const modeMenu = title?.querySelector<HTMLElement>('.rc-mode-menu');
  if (!title || !modeMenu) return false;

  installed = true;
  title.dataset.rcRedesign = '1';
  title.classList.add('rc-intro-stage');
  title.classList.remove('rc-menu-stage');
  modeMenu.classList.add('rc-premium-hidden');

  const prompt = title.querySelector<HTMLElement>('.press-start-text');
  if (prompt) prompt.textContent = 'TOQUE PARA INICIAR';

  const openMenu = (event: Event): void => {
    if (!title.classList.contains('rc-intro-stage')) return;
    event.preventDefault();
    event.stopPropagation();
    if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
    title.classList.remove('rc-intro-stage');
    title.classList.add('rc-menu-stage');
    modeMenu.classList.remove('rc-premium-hidden');
  };

  title.addEventListener('pointerdown', openMenu, true);
  title.addEventListener('click', openMenu, true);
  return true;
}

// O menu de modos é criado depois pelo ChampionshipPreview. Observamos o DOM
// em vez de depender da ordem/tempo dos módulos no Android.
if (!activateIntro()) {
  const observer = new MutationObserver(() => {
    if (activateIntro()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => { if (!installed) activateIntro(); }, 500);
  window.setTimeout(() => { if (!installed) activateIntro(); }, 1500);
}
