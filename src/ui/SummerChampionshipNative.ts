const SUMMER_IDS = new Set(['summer_beach', 'summer_sunset', 'summer_tropical']);
const SUMMER_NAMES = new Set(['PRAIA AO MEIO-DIA', 'ORLA DO PÔR DO SOL', 'COSTA TROPICAL']);

type MenuRuntime = {
  setTrack?: (index: number, sound?: boolean) => void;
  trackIndex?: number;
  trackRow?: number;
  tracks?: Array<{ id?: string }>;
};

type GameRuntime = { mainMenu?: MenuRuntime };

function menu(): MenuRuntime | null {
  return ((window as unknown as { __turboKartRush?: GameRuntime }).__turboKartRush?.mainMenu) ?? null;
}

function inSummer(): boolean {
  return sessionStorage.getItem('rc-championship') === 'summer';
}

function cardName(card: HTMLElement): string {
  return card.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase() ?? '';
}

function enforceSummerTracks(): void {
  if (!inSummer()) return;

  document.body.classList.add('rc-summer-active');
  const panel = document.querySelector<HTMLElement>('.panel-tracks');
  if (!panel) return;

  const m = menu();
  const tracks = m?.tracks ?? [];
  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.track-card'));
  let firstSummerIndex = -1;

  cards.forEach((card, index) => {
    const allowedById = SUMMER_IDS.has(tracks[index]?.id ?? '');
    const allowedByName = SUMMER_NAMES.has(cardName(card));
    const allowed = allowedById || allowedByName;

    if (allowed) {
      card.hidden = false;
      card.removeAttribute('aria-hidden');
      card.style.removeProperty('display');
      card.style.removeProperty('pointer-events');
      if (firstSummerIndex < 0) firstSummerIndex = index;
    } else {
      card.hidden = true;
      card.setAttribute('aria-hidden', 'true');
      card.style.setProperty('display', 'none', 'important');
      card.style.setProperty('pointer-events', 'none', 'important');
    }
  });

  if (m && firstSummerIndex >= 0) {
    const selected = typeof m.trackIndex === 'number' ? m.trackIndex : -1;
    const selectedTrack = tracks[selected];
    const selectedCard = cards[selected];
    const selectedIsSummer =
      SUMMER_IDS.has(selectedTrack?.id ?? '') ||
      (!!selectedCard && SUMMER_NAMES.has(cardName(selectedCard)));

    if (!selectedIsSummer) {
      m.trackRow = 0;
      m.setTrack?.(firstSummerIndex, false);
    }
  }

  const title = panel.querySelector<HTMLElement>('.panel-title');
  if (title) title.textContent = 'COPA VERÃO · ESCOLHA A CORRIDA';
}

function scheduleEnforce(): void {
  if (!inSummer()) return;
  requestAnimationFrame(enforceSummerTracks);
  window.setTimeout(enforceSummerTracks, 40);
  window.setTimeout(enforceSummerTracks, 120);
  window.setTimeout(enforceSummerTracks, 300);
}

export function installSummerChampionshipNative(): void {
  // O botão COMEÇAR COPA VERÃO pertence ao ChampionshipPreview.ts.
  // Este arquivo cuida somente de manter as três pistas da Copa visíveis.
  document.addEventListener('click', (event) => {
    if (!inSummer()) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('.char-card') ||
      target?.closest('.panel-chars .actions') ||
      target?.closest('.panel-tracks')
    ) {
      scheduleEnforce();
    }
  }, true);

  const observer = new MutationObserver(() => {
    if (inSummer()) scheduleEnforce();
  });
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['class'],
  });

  scheduleEnforce();
}

installSummerChampionshipNative();
