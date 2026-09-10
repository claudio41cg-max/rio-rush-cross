const SUMMER_IDS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;

type RuntimeMenu = {
  goTo?: (panel: 'title' | 'characterSelect' | 'trackSelect', sound: boolean) => void;
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

function hideSummerPanel(): void {
  document.querySelector<HTMLElement>('.rc-summer-cup')?.classList.add('hidden');
}

function openCharacterSelect(): void {
  const menu = getMenu();
  if (menu?.goTo) {
    menu.goTo('characterSelect', true);
    return;
  }

  const title = document.querySelector<HTMLElement>('.panel-title-screen');
  title?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
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

// Intercepta o botão antigo antes do listener dele. Assim não existe mais clique
// sintético nem tentativa de iniciar corrida por trás da interface.
document.addEventListener(
  'click',
  (ev) => {
    const target = ev.target as HTMLElement | null;
    const start = target?.closest<HTMLButtonElement>('.rc-summer-start');
    if (!start) return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    sessionStorage.setItem('rc-championship', 'summer');
    sessionStorage.removeItem('rc-summer-race');
    document.body.classList.add('rc-summer-active');
    hideSummerPanel();

    requestAnimationFrame(() => {
      openCharacterSelect();
    });
  },
  true,
);

// Reaplica o filtro sempre que o menu troca de painel. Isto garante que, depois
// de escolher o carro, o jogador veja somente as três pistas da Copa Verão.
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
