import type { Difficulty } from '../core/types';
import { el } from './dom';
import {
  beginChampionshipStage,
  CHAMPIONSHIP_STAGES_TOTAL,
  championshipDifficultyStatus,
  DIFFICULTY_COIN_LABEL,
  DIFFICULTY_LABEL,
  getActiveDifficulty,
  loadChampionship,
  startOrContinueChampionship,
  SUMMER_TRACKS,
} from '../core/championship';

const SUMMER_TRACK_IDS = SUMMER_TRACKS;
const SUMMER_TRACK_NAMES = ['PRAIA AO MEIO-DIA', 'CAIS DA BRISA', 'ORLA DO PÔR DO SOL', 'COSTA TROPICAL', 'PONTA DO FAROL'];
const SUMMER_TRACK_LABELS = ['☀️ Praia ao Meio-Dia', '⚓ Cais da Brisa', '🌅 Orla do Pôr do Sol', '🌴 Costa Tropical', '🗼 Ponta do Farol'];
const RACE_SONGS = ['SUMMER DRIVE', 'BEACH RUNNERS', 'SUNSET RACE', 'TROPICAL VIBES', 'NIGHT SPEED'];
const CUPS = [
  { icon: '☀️', name: 'COPA VERÃO', sub: '5 pistas costeiras', state: 'ABERTA', cls: 'summer' },
  { icon: '❄️', name: 'COPA INVERNO', sub: '3 pistas geladas', state: 'BLOQUEADA', cls: 'winter' },
  { icon: '🌙', name: 'COPA DA NOITE', sub: '3 pistas noturnas', state: 'BLOQUEADA', cls: 'night' },
  { icon: '🏜️', name: 'COPA DO DESERTO', sub: '3 pistas quentes', state: 'BLOQUEADA', cls: 'desert' },
  { icon: '🌲', name: 'COPA FLORESTA', sub: '3 pistas verdes', state: 'BLOQUEADA', cls: 'forest' },
];

const DIFFICULTIES: Array<{ id: Difficulty; icon: string; sub: string }> = [
  { id: 'easy', icon: '🌴', sub: 'Rivais mais tranquilos' },
  { id: 'normal', icon: '🏁', sub: 'Desafio equilibrado' },
  { id: 'hard', icon: '🔥', sub: 'Rivais no máximo' },
];

type MenuRuntime = {
  tracks?: Array<{ id?: string }>;
  setTrack?: (index: number, sound?: boolean) => void;
  setDifficulty?: (index: number, sound?: boolean) => void;
  goTo?: (panel: 'title' | 'characterSelect' | 'trackSelect', sound: boolean) => void;
};
type GameRuntime = { mainMenu?: MenuRuntime };

function menu(): MenuRuntime | null {
  return ((window as unknown as { __turboKartRush?: GameRuntime }).__turboKartRush?.mainMenu) ?? null;
}

function stop(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
}

function setSummer(enabled: boolean): void {
  document.body.classList.toggle('rc-summer-active', enabled);
  if (!enabled) {
    sessionStorage.removeItem('rc-championship');
    sessionStorage.removeItem('rc-summer-race');
    delete document.body.dataset.rcSummerStage;
  }
}

function difficultyIndex(difficulty: Difficulty): number {
  return difficulty === 'easy' ? 0 : difficulty === 'hard' ? 2 : 1;
}

function syncChampionshipTrackPanel(): void {
  if (sessionStorage.getItem('rc-championship') !== 'summer') return;
  const difficulty = getActiveDifficulty();
  if (!difficulty) return;
  const stage = Math.max(
    0,
    Math.min(CHAMPIONSHIP_STAGES_TOTAL - 1, Number(sessionStorage.getItem('rc-summer-race') ?? '0')),
  );
  document.body.dataset.rcSummerStage = String(stage);

  const m = menu();
  m?.setDifficulty?.(difficultyIndex(difficulty), false);

  const panel = document.querySelector<HTMLElement>('.panel-tracks');
  if (!panel || !panel.classList.contains('active')) return;

  const diffButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>('.difficulty .seg'));
  diffButtons.forEach((button, index) => {
    button.disabled = true;
    button.classList.toggle('selected', index === difficultyIndex(difficulty));
    button.setAttribute('aria-disabled', 'true');
  });

  const label = panel.querySelector<HTMLElement>('.difficulty-label');
  if (label) label.textContent = `DIFICULDADE DO CAMPEONATO · ${DIFFICULTY_LABEL[difficulty]} · TRAVADA`;
  const blurb = panel.querySelector<HTMLElement>('.difficulty-blurb');
  if (blurb) blurb.textContent = 'A dificuldade escolhida vale até o fim desta Copa.';
  const start = panel.querySelector<HTMLButtonElement>('.start');
  if (start) start.textContent = `COMEÇAR ETAPA ${stage + 1}`;

  const trackCards = Array.from(panel.querySelectorAll<HTMLElement>('.track-card'));
  trackCards.forEach((card) => {
    const name = card.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase() ?? '';
    if (!SUMMER_TRACK_NAMES.includes(name)) return;
    card.querySelector('.rc-champ-track-note')?.remove();
  });
  const selectedName = SUMMER_TRACK_NAMES[stage];
  const selected = trackCards.find((card) => card.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase() === selectedName);
  if (selected) {
    const note = el('div', 'rc-champ-track-note', `ETAPA ${stage + 1}/${CHAMPIONSHIP_STAGES_TOTAL} · ${DIFFICULTY_LABEL[difficulty]}`, selected);
    note.setAttribute('aria-label', `Etapa ${stage + 1} de ${CHAMPIONSHIP_STAGES_TOTAL}, dificuldade ${DIFFICULTY_LABEL[difficulty]}`);
  }
}

function chooseSummerTrack(index: number): void {
  if (!beginChampionshipStage(index)) return;
  document.body.dataset.rcSummerStage = String(index);
  const m = menu();
  const wanted = SUMMER_TRACK_IDS[index];
  const runtimeIndex = m?.tracks?.findIndex((t) => t.id === wanted) ?? -1;
  if (runtimeIndex >= 0) m?.setTrack?.(runtimeIndex, false);
  const difficulty = getActiveDifficulty();
  if (difficulty) m?.setDifficulty?.(difficultyIndex(difficulty), false);
  m?.goTo?.('characterSelect', true);
  requestAnimationFrame(syncChampionshipTrackPanel);
  setTimeout(syncChampionshipTrackPanel, 120);
}

function createSettingsPanel(title: HTMLElement): HTMLElement {
  const panel = el('div', 'rc-settings hidden', undefined, title);
  el('div', 'rc-cups-kicker', 'CONFIGURAÇÕES', panel);
  el('div', 'rc-cups-title', 'ÁUDIO DA CORRIDA', panel);
  const volumeRow = el('div', 'rc-setting-row', undefined, panel);
  el('label', '', '🎵 VOLUME DA MÚSICA', volumeRow);
  const volume = document.createElement('input');
  volume.type = 'range'; volume.min = '10'; volume.max = '100'; volume.step = '5';
  volume.value = String(Math.round(Number(localStorage.getItem('rc-music-volume') ?? '0.72') * 100));
  const volumeValue = el('b', '', `${volume.value}%`, volumeRow);
  volume.addEventListener('input', () => {
    volumeValue.textContent = `${volume.value}%`;
    localStorage.setItem('rc-music-volume', String(Number(volume.value) / 100));
  });
  volumeRow.appendChild(volume);
  el('div', 'rc-setting-label', 'ESCOLHER MÚSICA DA CORRIDA', panel);
  const list = el('div', 'rc-music-list', undefined, panel);
  let selected = Math.max(0, Math.min(4, Number(localStorage.getItem('rc-race-song') ?? '0')));
  const buttons: HTMLButtonElement[] = [];
  RACE_SONGS.forEach((name, i) => {
    const b = el('button', 'rc-music-choice', `${i + 1}. ${name}`, list) as HTMLButtonElement;
    b.type = 'button'; b.classList.toggle('selected', i === selected);
    b.addEventListener('click', (ev) => {
      stop(ev); selected = i; localStorage.setItem('rc-race-song', String(i));
      buttons.forEach((x, k) => x.classList.toggle('selected', k === selected));
    });
    buttons.push(b);
  });
  el('div', 'rc-settings-note', 'A nova música e o volume entram na próxima corrida.', panel);
  const back = el('button', 'rc-cups-back', '← VOLTAR', panel) as HTMLButtonElement;
  back.type = 'button';
  return panel;
}

export function installChampionshipPreview(): void {
  const tryInstall = (): boolean => {
    const title = document.querySelector<HTMLElement>('.panel-title-screen');
    if (!title || title.querySelector('.rc-mode-menu')) return !!title;

    sessionStorage.removeItem('rc-summer-pending');
    setSummer(false);

    const modeMenu = el('div', 'rc-mode-menu', undefined, title);
    const modeTitle = el('div', 'rc-mode-title', 'ESCOLHA O MODO', modeMenu);
    modeTitle.setAttribute('aria-hidden', 'true');
    const row = el('div', 'rc-mode-buttons', undefined, modeMenu);
    const champ = el('button', 'rc-mode-btn rc-mode-primary', '🏆 CAMPEONATO', row) as HTMLButtonElement;
    const free = el('button', 'rc-mode-btn', '🏁 CORRIDA LIVRE', row) as HTMLButtonElement;
    const garage = el('button', 'rc-mode-btn', '🔧 GARAGEM', row) as HTMLButtonElement;
    const settings = el('button', 'rc-mode-btn', '⚙ CONFIGURAÇÕES', row) as HTMLButtonElement;
    [champ, free, garage, settings].forEach((b) => b.type = 'button');

    const cups = el('div', 'rc-cups hidden', undefined, title);
    const head = el('div', 'rc-cups-head', undefined, cups);
    el('div', 'rc-cups-kicker', 'MODO CAMPEONATO', head);
    el('div', 'rc-cups-title', 'ESCOLHA SUA COPA', head);
    const cards = el('div', 'rc-cup-grid', undefined, cups);

    const difficultyPanel = el('div', 'rc-champ-difficulty hidden', undefined, title);
    el('div', 'rc-cups-kicker', 'COPA VERÃO', difficultyPanel);
    el('div', 'rc-cups-title', 'ESCOLHA A DIFICULDADE', difficultyPanel);
    el('div', 'rc-champ-difficulty-note', 'A dificuldade fica travada até o fim do campeonato.', difficultyPanel);
    const difficultyGrid = el('div', 'rc-champ-difficulty-grid', undefined, difficultyPanel);
    const difficultyButtons: HTMLButtonElement[] = [];

    const summerPanel = el('div', 'rc-summer-cup hidden', undefined, title);
    const summerKicker = el('div', 'rc-cups-kicker', 'COPA VERÃO', summerPanel);
    el('div', 'rc-cups-title', 'ETAPAS DA COPA VERÃO', summerPanel);
    const summerTracks = el('div', 'rc-summer-track-list', undefined, summerPanel);
    const trackButtons: HTMLButtonElement[] = [];

    const refreshDifficultyCards = (): void => {
      DIFFICULTIES.forEach((entry, index) => {
        const status = championshipDifficultyStatus(entry.id);
        const button = difficultyButtons[index];
        if (!button) return;
        button.classList.toggle('cleared', status.cleared);
        const state = button.querySelector<HTMLElement>('.rc-champ-diff-state');
        if (state) {
          state.textContent = status.cleared
            ? '🏆 CAMPEÃO · JOGAR NOVAMENTE'
            : status.racesDone > 0 && !status.completed
              ? `CONTINUAR · ETAPA ${status.currentStage + 1}/${CHAMPIONSHIP_STAGES_TOTAL}`
              : 'COMEÇAR CAMPEONATO';
        }
      });
    };

    const refreshStages = (): void => {
      const difficulty = getActiveDifficulty() ?? 'easy';
      const cup = loadChampionship(difficulty);
      summerKicker.textContent = `COPA VERÃO · ${DIFFICULTY_LABEL[difficulty]}`;
      trackButtons.forEach((item, i) => {
        const result = cup.results.find((r) => r.stage === i);
        const completed = !!result;
        const current = !cup.completed && i === cup.currentStage && !completed;
        const locked = !completed && !current;
        item.disabled = completed || locked;
        item.classList.toggle('locked', locked);
        item.classList.toggle('completed', completed);
        item.classList.toggle('current', current);
        item.setAttribute('aria-disabled', String(item.disabled));
        const status = item.querySelector<HTMLElement>('.rc-stage-status');
        if (status) {
          const playerLine = result?.standings.find((s) => s.isPlayer);
          status.textContent = completed
            ? `${result?.playerPlace ?? 8}º · +${playerLine?.points ?? 1} PTS`
            : current
              ? '▶ A JOGAR'
              : '🔒 BLOQUEADA';
        }
      });
    };

    DIFFICULTIES.forEach((entry) => {
      const card = el('button', `rc-champ-difficulty-card ${entry.id}`, undefined, difficultyGrid) as HTMLButtonElement;
      card.type = 'button';
      el('div', 'rc-champ-diff-icon', entry.icon, card);
      el('strong', '', DIFFICULTY_LABEL[entry.id], card);
      el('span', '', entry.sub, card);
      el('small', 'rc-champ-diff-coins', `🪙 ${DIFFICULTY_COIN_LABEL[entry.id]}`, card);
      el('b', 'rc-champ-diff-state', '', card);
      card.addEventListener('click', (ev) => {
        stop(ev);
        startOrContinueChampionship(entry.id);
        refreshDifficultyCards();
        refreshStages();
        difficultyPanel.classList.add('hidden');
        summerPanel.classList.remove('hidden');
      });
      difficultyButtons.push(card);
    });
    refreshDifficultyCards();

    SUMMER_TRACK_LABELS.forEach((name, i) => {
      const item = el('button', 'rc-summer-track', undefined, summerTracks) as HTMLButtonElement;
      item.type = 'button';
      el('b', '', `ETAPA ${i + 1}`, item);
      el('span', '', name, item);
      el('small', 'rc-stage-status', '', item);
      item.addEventListener('click', (ev) => {
        stop(ev);
        const difficulty = getActiveDifficulty();
        if (!difficulty) return;
        const cup = loadChampionship(difficulty);
        if (cup.completed || i !== cup.currentStage || cup.results.some((r) => r.stage === i)) return;
        summerPanel.classList.add('hidden');
        chooseSummerTrack(i);
      });
      trackButtons.push(item);
    });
    refreshStages();

    const summerActions = el('div', 'rc-summer-actions', undefined, summerPanel);
    const summerBack = el('button', 'rc-cups-back', '← DIFICULDADE', summerActions) as HTMLButtonElement;
    summerBack.type = 'button';
    const difficultyBack = el('button', 'rc-cups-back', '← COPAS', difficultyPanel) as HTMLButtonElement;
    difficultyBack.type = 'button';

    for (const cup of CUPS) {
      const card = el('button', `rc-cup-card ${cup.cls}`, undefined, cards) as HTMLButtonElement;
      card.type = 'button';
      el('div', 'rc-cup-icon', cup.icon, card);
      const txt = el('div', 'rc-cup-copy', undefined, card);
      el('strong', '', cup.name, txt);
      el('span', '', cup.sub, txt);
      el('small', cup.state === 'ABERTA' ? 'open' : '', cup.state, txt);
      card.addEventListener('click', (ev) => {
        stop(ev);
        if (cup.state !== 'ABERTA') return;
        refreshDifficultyCards();
        cups.classList.add('hidden');
        difficultyPanel.classList.remove('hidden');
      });
    }

    const back = el('button', 'rc-cups-back', '← VOLTAR', cups) as HTMLButtonElement;
    back.type = 'button';
    const settingsPanel = createSettingsPanel(title);
    const settingsBack = settingsPanel.querySelector<HTMLButtonElement>('.rc-cups-back');

    champ.addEventListener('click', (ev) => {
      stop(ev); setSummer(false); modeMenu.classList.add('hidden'); cups.classList.remove('hidden');
    });
    free.addEventListener('click', (ev) => {
      stop(ev); setSummer(false); requestAnimationFrame(() => title.click());
    });
    summerBack.addEventListener('click', (ev) => {
      stop(ev); setSummer(false); summerPanel.classList.add('hidden'); refreshDifficultyCards(); difficultyPanel.classList.remove('hidden');
    });
    difficultyBack.addEventListener('click', (ev) => {
      stop(ev); setSummer(false); difficultyPanel.classList.add('hidden'); cups.classList.remove('hidden');
    });
    garage.addEventListener('click', (ev) => {
      stop(ev); const old = garage.textContent; garage.textContent = 'EM BREVE'; setTimeout(() => garage.textContent = old, 900);
    });
    settings.addEventListener('click', (ev) => {
      stop(ev); modeMenu.classList.add('hidden'); settingsPanel.classList.remove('hidden');
    });
    settingsBack?.addEventListener('click', (ev) => {
      stop(ev); settingsPanel.classList.add('hidden'); modeMenu.classList.remove('hidden');
    });
    back.addEventListener('click', (ev) => {
      stop(ev); setSummer(false); cups.classList.add('hidden'); modeMenu.classList.remove('hidden');
    });

    const oldPrompt = title.querySelector<HTMLElement>('.press-start');
    if (oldPrompt) oldPrompt.style.display = 'none';
    const legend = title.querySelector<HTMLElement>('.controls-legend');
    if (legend) legend.style.display = 'none';

    // MainMenu remains the race launcher; this small sync only locks the cup's chosen stage/difficulty.
    const syncTimer = window.setInterval(syncChampionshipTrackPanel, 160);
    window.addEventListener('beforeunload', () => window.clearInterval(syncTimer), { once: true });
    return true;
  };

  if (tryInstall()) return;
  const observer = new MutationObserver(() => { if (tryInstall()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
}
