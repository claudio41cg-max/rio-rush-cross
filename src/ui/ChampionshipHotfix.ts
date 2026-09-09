// Championship flow hotfix: reliable confirmation actions + starter car progression.
// Kept separate so the working championship UI remains easy to roll back.

const isSummer = () => sessionStorage.getItem('rc-championship') === 'summer';
const raceIndex = () => Math.max(0, Math.min(2, Number(sessionStorage.getItem('rc-summer-race') ?? '0')));

function visibleTrackPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.panel-tracks.active');
}

function selectChampionshipTrack(panel: HTMLElement, index: number): void {
  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.track-card'));
  const names = ['PRAIA AO MEIO-DIA', 'ORLA DO PÔR DO SOL', 'COSTA TROPICAL'];
  const target = cards.find(c => c.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase() === names[index]);
  if (!target) return;

  // MainMenu starts a race when an already-selected track is clicked. To select
  // safely, first select a different card and only then the championship card.
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

  // Copa Verão starts with only the first two RCs. More cars will be unlocked
  // by championship progression in later cups.
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
  `;
  document.head.appendChild(style);

  // Capture before the preview's original listeners so the two buttons cannot
  // be swallowed by the hidden track panel logic.
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
      confirm.classList.add('hidden');
      panel.style.visibility = '';
      const backButton = Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('VOLTAR'));
      backButton?.click();
      setTimeout(unlockStarterCars, 0);
      return;
    }

    selectChampionshipTrack(panel, raceIndex());
    confirm.classList.add('hidden');
    panel.style.visibility = '';
    const raceButton = Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('INICIAR CORRIDA'));
    raceButton?.click();
  }, true);

  const refresh = () => {
    cleanConfirmationCopy();
    unlockStarterCars();
  };
  new MutationObserver(refresh).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  refresh();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
