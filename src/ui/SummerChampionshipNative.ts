const SUMMER_IDS = new Set(['summer_beach', 'summer_sunset', 'summer_tropical']);

type MenuRuntime = {
  goTo?: (panel: 'title' | 'characterSelect' | 'trackSelect', sound: boolean) => void;
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

function openCharacterSelect(): void {
  const m = menu();
  if (m?.goTo) m.goTo('characterSelect', true);
}

function enforceSummerTracks(): void {
  if (!inSummer()) return;
  const m = menu();
  const panel = document.querySelector<HTMLElement>('.panel-tracks.active');
  if (!m || !panel) return;

  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.track-card'));
  const tracks = m.tracks ?? [];
  let first = -1;

  cards.forEach((card, index) => {
    const allowed = SUMMER_IDS.has(tracks[index]?.id ?? '');
    card.hidden = !allowed;
    card.style.display = allowed ? '' : 'none';
    if (allowed && first < 0) first = index;
  });

  if (first >= 0) {
    const selected = typeof m.trackIndex === 'number' ? m.trackIndex : -1;
    if (!SUMMER_IDS.has(tracks[selected]?.id ?? '')) {
      m.trackRow = 0;
      m.setTrack?.(first, false);
    }
  }

  const title = panel.querySelector<HTMLElement>('.panel-title');
  if (title) title.textContent = 'COPA VERÃO · ESCOLHA A CORRIDA';
}

export function installSummerChampionshipNative(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const start = target?.closest<HTMLButtonElement>('.rc-summer-start');
    if (!start) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    sessionStorage.setItem('rc-championship', 'summer');
    sessionStorage.removeItem('rc-summer-race');
    document.body.classList.add('rc-summer-active');
    document.querySelector<HTMLElement>('.rc-summer-cup')?.classList.add('hidden');

    requestAnimationFrame(openCharacterSelect);
  }, true);

  const observer = new MutationObserver(() => {
    if (inSummer()) requestAnimationFrame(enforceSummerTracks);
  });
  observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class'] });

  document.addEventListener('click', () => {
    if (inSummer()) requestAnimationFrame(enforceSummerTracks);
  }, true);
}

installSummerChampionshipNative();
