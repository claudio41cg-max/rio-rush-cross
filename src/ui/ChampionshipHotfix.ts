// Championship flow hotfix: reliable confirmation actions + starter car progression.
// Kept separate so the working championship UI remains easy to roll back.

const isSummer = () => sessionStorage.getItem('rc-championship') === 'summer';
const raceIndex = () => Math.max(0, Math.min(2, Number(sessionStorage.getItem('rc-summer-race') ?? '0')));

function visibleTrackPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.panel-tracks.active');
}

function hideConfirmation(): void {
  document.querySelectorAll<HTMLElement>('.rc-summer-confirm').forEach(confirm => {
    confirm.classList.add('hidden');
    confirm.style.display = 'none';
    confirm.style.pointerEvents = 'none';
  });
}

function selectChampionshipTrack(panel: HTMLElement, index: number): void {
  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.track-card'));
  const names = ['PRAIA AO MEIO-DIA', 'ORLA DO PÔR DO SOL', 'COSTA TROPICAL'];
  const target = cards.find(c => c.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase() === names[index]);
  if (!target) return;

  if (target.classList.contains('selected')) {
    const other = cards.find(c => c !== target && !c.classList.contains('selected'));
    other?.click();
  }
  if (!target.classList.contains('selected')) target.click();
}

function unlockStarterCars(): void {
  const panel = document.querySelector<HTMLElement>('.panel-chars.active');
  if (!panel || !isSummer()) return;
  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.char-card'));
  if (!cards.length) return;

  cards.forEach((card, i) => {
    const locked = i >= 2;
    card.classList.toggle('rc-car-locked', locked);
    card.setAttribute('aria-disabled', locked ? 'true' : 'false');
    if (locked) {
      card.style.pointerEvents = 'none';
      if (!card.querySelector('.rc-lock-badge')) {
        const badge = document.createElement('span');
        badge.className = 'rc-lock-badge';
        badge.textContent = '🔒 BLOQUEADO';
        card.appendChild(badge);
      }
    } else {
      card.style.pointerEvents = '';
      card.querySelector('.rc-lock-badge')?.remove();
    }
  });

  const selected = cards.findIndex(c => c.classList.contains('selected'));
  if (selected >= 2) cards[0]?.click();
}

function cleanConfirmationCopy(): void {
  const confirm = document.querySelector<HTMLElement>('.rc-summer-confirm:not(.hidden)');
  if (!confirm) return;
  confirm.querySelector<HTMLElement>('.rc-confirm-info small')?.remove();
}

function install(): void {
  const style = document.createElement('style');
  style.textContent = `
    .panel-chars .char-card.rc-car-locked{opacity:.42;filter:grayscale(.75);position:relative}
    .rc-lock-badge{position:absolute;left:6px;right:6px;bottom:8px;padding:5px 3px;border-radius:8px;background:rgba(5,8,18,.88);border:1px solid rgba(255,255,255,.22);font-size:10px;font-weight:900;letter-spacing:.04em;text-align:center;color:#fff;z-index:5}
    .rc-summer-confirm.hidden{display:none!important;pointer-events:none!important}
  `;
  document.head.appendChild(style);

  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    const start = target?.closest<HTMLButtonElement>('.rc-confirm-start');
    const back = target?.closest<HTMLButtonElement>('.rc-summer-confirm .rc-cups-back');
    if (!start && !back) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    const confirm = document.querySelector<HTMLElement>('.rc-summer-confirm');
    const panel = visibleTrackPanel();
    if (!confirm || !panel) return;

    if (back) {
      hideConfirmation();
      panel.style.visibility = '';
      const backButton = Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('VOLTAR'));
      backButton?.click();
      setTimeout(unlockStarterCars, 0);
      return;
    }

    selectChampionshipTrack(panel, raceIndex());
    // Remove the confirmation overlay BEFORE starting the race so it can never
    // remain over the HUD/canvas on Android.
    hideConfirmation();
    panel.style.visibility = '';
    const raceButton = Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('INICIAR CORRIDA'));
    raceButton?.click();
  }, true);

  const refresh = () => {
    const racing = document.querySelector('#rio-mobile-controls.race-active');
    if (racing) hideConfirmation();
    else {
      cleanConfirmationCopy();
      unlockStarterCars();
    }
  };
  new MutationObserver(refresh).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  refresh();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
