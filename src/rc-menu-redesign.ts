/* RC Rush — nova abertura em duas etapas. UI-only compatibility layer. */
function installMenuRedesign(): void {
  const title = document.querySelector<HTMLElement>('.panel-title-screen');
  if (!title) { window.setTimeout(installMenuRedesign, 80); return; }
  if (title.dataset.rcRedesign === '1') return;
  title.dataset.rcRedesign = '1';

  const modeMenu = title.querySelector<HTMLElement>('.rc-mode-menu');
  if (!modeMenu) { title.dataset.rcRedesign = ''; window.setTimeout(installMenuRedesign, 80); return; }

  title.classList.add('rc-intro-stage');
  modeMenu.classList.add('hidden');
  const prompt = title.querySelector<HTMLElement>('.press-start-text');
  if (prompt) prompt.textContent = 'TOQUE PARA INICIAR';

  const openMenu = (event: Event): void => {
    if (!title.classList.contains('rc-intro-stage')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    title.classList.remove('rc-intro-stage');
    title.classList.add('rc-menu-stage');
    modeMenu.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('rc:premium-menu-open'));
  };
  title.addEventListener('click', openMenu, true);
  title.addEventListener('pointerup', openMenu, true);

  // Se outra tela do menu abrir, remove o modo de apresentação sem interferir na navegação existente.
  const observer = new MutationObserver(() => {
    if (!title.classList.contains('active')) title.classList.remove('rc-intro-stage','rc-menu-stage');
  });
  observer.observe(title, { attributes:true, attributeFilter:['class'] });
}
installMenuRedesign();
