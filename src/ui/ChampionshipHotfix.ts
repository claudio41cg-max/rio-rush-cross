// Championship flow hotfix: reliable confirmation actions + starter car progression.
// Kept separate so the working championship UI remains easy to roll back.

const isSummer = () => sessionStorage.getItem('rc-championship') === 'summer';
const raceIndex = () => Math.max(0, Math.min(2, Number(sessionStorage.getItem('rc-summer-race') ?? '0')));
const SUMMER_TRACK_IDS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;

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

function startSelectedSummerRace(index: number): boolean {
  const game = (window as unknown as { __turboKartRush?: unknown }).__turboKartRush as any;
  const menu = game?.mainMenu as any;
  if (!menu || !Array.isArray(menu.tracks)) return false;

  const wantedId = SUMMER_TRACK_IDS[index];
  const exactIndex = menu.tracks.findIndex((track: { id?: string }) => track?.id === wantedId);
  if (exactIndex < 0) return false;

  // Set MainMenu's real selected track directly. This avoids synthetic card
  // clicks, which can accidentally start the previously selected circuit.
  menu.trackIndex = exactIndex;
  menu.trackRow = 0;
  if (Array.isArray(menu.trackCards)) {
    menu.trackCards.forEach((card: HTMLElement, i: number) => {
      card.classList.toggle('selected', i === exactIndex);
      card.classList.toggle('focused', i === exactIndex);
    });
  }

  if (typeof menu.start !== 'function') return false;
  menu.start();
  return true;
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

    // Hide first, then start exactly the race stored by the Copa Verão screen.
    // No track-card clicks and no hidden INICIAR CORRIDA button are used here.
    hideConfirmation();
    panel.style.visibility = '';
    if (!startSelectedSummerRace(raceIndex())) {
      // Safe fallback: show the track panel again instead of starting a wrong race.
      panel.style.visibility = '';
    }
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
