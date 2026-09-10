const SUMMER_IDS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;
const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

type RuntimeTrack = { id: string; laps?: number };
type RuntimeCharacter = { id: string };
type RuntimeMenu = {
  tracks?: RuntimeTrack[];
  characters?: RuntimeCharacter[];
  charIndex?: number;
  difficultyIndex?: number;
  setTrack?: (index: number, sound?: boolean) => void;
  setCharacter?: (index: number, sound?: boolean) => void;
  onStart?: (settings: { characterId: string; trackId: string; difficulty: 'easy' | 'normal' | 'hard'; laps: number }) => void;
};
type RuntimeGame = { mainMenu?: RuntimeMenu };

function menu(): RuntimeMenu | null {
  return ((window as unknown as { __turboKartRush?: RuntimeGame }).__turboKartRush?.mainMenu) ?? null;
}

function pending(): boolean {
  return sessionStorage.getItem('rc-summer-pending') === '1';
}

function selectedStage(): number {
  const n = Number(sessionStorage.getItem('rc-summer-race') ?? '0');
  return Math.max(0, Math.min(2, Number.isFinite(n) ? Math.floor(n) : 0));
}

function clearSummerState(): void {
  sessionStorage.removeItem('rc-summer-pending');
  sessionStorage.removeItem('rc-championship');
  document.body.classList.remove('rc-summer-active');
}

function showCharacterSelection(): void {
  const title = document.querySelector<HTMLElement>('.panel-title-screen');
  const summerPanel = document.querySelector<HTMLElement>('.rc-summer-cup');
  summerPanel?.classList.add('hidden');
  requestAnimationFrame(() => title?.click());
  requestAnimationFrame(() => {
    const panel = document.querySelector<HTMLElement>('.panel-chars.active');
    if (!panel) return;
    const kicker = panel.querySelector<HTMLElement>('.panel-kicker');
    if (kicker) kicker.textContent = 'COPA VERÃO · ESCOLHA O CARRINHO';
    const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('.actions button'));
    if (buttons[1]) buttons[1].textContent = 'COMEÇAR COPA VERÃO';
  });
}

function startSelectedRace(): void {
  const m = menu();
  if (!m) return;
  const stage = selectedStage();
  const wantedId = SUMMER_IDS[stage];
  const trackIndex = m.tracks?.findIndex((t) => t.id === wantedId) ?? -1;
  const index = trackIndex >= 0 ? trackIndex : stage;
  const track = m.tracks?.[index];
  const charIndex = Math.max(0, Number(m.charIndex) || 0);
  const character = m.characters?.[charIndex];
  if (!track || !character || !m.onStart) return;

  m.setTrack?.(index, false);
  sessionStorage.removeItem('rc-summer-pending');
  sessionStorage.setItem('rc-championship', 'summer');
  document.body.classList.add('rc-summer-active');

  const difficultyIndex = Math.max(0, Math.min(2, Number(m.difficultyIndex) || 1));
  m.onStart({
    characterId: character.id,
    trackId: track.id,
    difficulty: DIFFICULTIES[difficultyIndex],
    laps: track.laps && track.laps > 0 ? track.laps : 3,
  });
}

export function installSummerFlowFix(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const summerTrack = target.closest<HTMLElement>('.rc-summer-track');
    if (summerTrack) {
      const tracks = Array.from(document.querySelectorAll<HTMLElement>('.rc-summer-track'));
      const index = tracks.indexOf(summerTrack);
      if (index < 0 || index > 2) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      clearSummerState();
      sessionStorage.setItem('rc-summer-race', String(index));
      sessionStorage.setItem('rc-summer-pending', '1');
      showCharacterSelection();
      return;
    }

    if (!pending()) return;

    const charCard = target.closest<HTMLElement>('.panel-chars.active .char-card');
    if (charCard) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.panel-chars .char-card'));
      const index = cards.indexOf(charCard);
      if (index >= 0) menu()?.setCharacter?.(index, true);
      return;
    }

    const action = target.closest<HTMLButtonElement>('.panel-chars.active .actions button');
    if (!action) return;
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.panel-chars.active .actions button'));
    const index = buttons.indexOf(action);

    if (index === 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      startSelectedRace();
      return;
    }

    if (index === 0) {
      sessionStorage.removeItem('rc-summer-pending');
      sessionStorage.removeItem('rc-summer-race');
    }
  }, true);
}
