const SUMMER_IDS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;

type RuntimeMenu = {
  setTrack?: (index: number, sound?: boolean) => void;
  trackIndex?: number;
  trackRow?: number;
  tracks?: Array<{ id?: string }>;
};

type RuntimeGame = {
  mainMenu?: RuntimeMenu;
};

function isSummerMode(): boolean {
  return sessionStorage.getItem('rc-championship') === 'summer';
}

function getMenu(): RuntimeMenu | null {
  const game = (window as unknown as { __turboKartRush?: RuntimeGame }).__turboKartRush;
  return game?.mainMenu ?? null;
}

function filterChampionshipTracks(): void {
  if (!isSummerMode()) return;

  const panel = document.querySelector<HTMLElement>('.panel-tracks.active');
  if (!panel) return;

  const menu = getMenu();
  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.track-card'));
  const tracks = menu?.tracks ?? [];

  let firstSummer = -1;
  cards.forEach((card, index) => {
    const id = tracks[index]?.id ?? '';
    const allowed = SUMMER_IDS.includes(id as (typeof SUMMER_IDS)[number]);
    card.style.display = allowed ? '' : 'none';
    if (allowed && firstSummer < 0) firstSummer = index;
  });

  const current = typeof menu?.trackIndex === 'number' ? menu.trackIndex : -1;
  const currentId = current >= 0 ? tracks[current]?.id ?? '' : '';
  const currentAllowed = SUMMER_IDS.includes(currentId as (typeof SUMMER_IDS)[number]);

  if (!currentAllowed && firstSummer >= 0 && menu?.setTrack) {
    menu.trackRow = 0;
    menu.setTrack(firstSummer, false);
  }

  const title = panel.querySelector<HTMLElement>('.panel-title');
  if (title) title.textContent = 'COPA VERÃO · ESCOLHA A CORRIDA';
}

function clearNonChampionshipFilter(): void {
  if (isSummerMode()) return;
  document.querySelectorAll<HTMLElement>('.panel-tracks .track-card').forEach((card) => {
    card.style.display = '';
  });
}

// O início da Copa é controlado exclusivamente por ChampionshipPreview.ts.
// Este bridge não intercepta mais .rc-summer-start.
const observer = new MutationObserver(() => {
  if (isSummerMode()) filterChampionshipTracks();
  else clearNonChampionshipFilter();
});

observer.observe(document.body, {
  attributes: true,
  childList: true,
  subtree: true,
  attributeFilter: ['class'],
});

window.addEventListener('pageshow', () => {
  if (isSummerMode()) requestAnimationFrame(filterChampionshipTracks);
});
