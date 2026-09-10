import { el } from './dom';
import { beginChampionshipStage, loadChampionship, SUMMER_TRACKS } from '../core/championship';

const SUMMER_TRACK_IDS = SUMMER_TRACKS;
const RACE_SONGS = ['SUMMER DRIVE', 'BEACH RUNNERS', 'SUNSET RACE', 'TROPICAL VIBES', 'NIGHT SPEED'];
const CUPS = [
  { icon: '☀️', name: 'COPA VERÃO', sub: '3 pistas costeiras', state: 'ABERTA', cls: 'summer' },
  { icon: '❄️', name: 'COPA INVERNO', sub: '3 pistas geladas', state: 'BLOQUEADA', cls: 'winter' },
  { icon: '🌙', name: 'COPA DA NOITE', sub: '3 pistas noturnas', state: 'BLOQUEADA', cls: 'night' },
  { icon: '🏜️', name: 'COPA DO DESERTO', sub: '3 pistas quentes', state: 'BLOQUEADA', cls: 'desert' },
  { icon: '🌲', name: 'COPA FLORESTA', sub: '3 pistas verdes', state: 'BLOQUEADA', cls: 'forest' },
];

type MenuRuntime = {
  tracks?: Array<{ id?: string }>;
  setTrack?: (index: number, sound?: boolean) => void;
  goTo?: (panel: 'title' | 'characterSelect' | 'trackSelect', sound: boolean) => void;
};
type GameRuntime = { mainMenu?: MenuRuntime };
function menu(): MenuRuntime | null { return ((window as unknown as { __turboKartRush?: GameRuntime }).__turboKartRush?.mainMenu) ?? null; }
function stop(ev: Event): void { ev.preventDefault(); ev.stopPropagation(); }
function setSummer(enabled: boolean): void {
  document.body.classList.toggle('rc-summer-active', enabled);
  if (!enabled) {
    sessionStorage.removeItem('rc-championship');
    sessionStorage.removeItem('rc-summer-race');
  }
}
function chooseSummerTrack(index: number): void {
  if (!beginChampionshipStage(index)) return;
  const m = menu();
  const wanted = SUMMER_TRACK_IDS[index];
  const runtimeIndex = m?.tracks?.findIndex((t) => t.id === wanted) ?? -1;
  if (runtimeIndex >= 0) m?.setTrack?.(runtimeIndex, false);
  m?.goTo?.('characterSelect', true);
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

    const summerPanel = el('div', 'rc-summer-cup hidden', undefined, title);
    el('div', 'rc-cups-kicker', 'COPA VERÃO', summerPanel);
    el('div', 'rc-cups-title', 'ETAPAS DA COPA VERÃO', summerPanel);
    const summerTracks = el('div', 'rc-summer-track-list', undefined, summerPanel);
    const names = ['☀️ Praia ao Meio-Dia', '🌅 Orla do Pôr do Sol', '🌴 Costa Tropical'];
    const trackButtons: HTMLButtonElement[] = [];

    const refreshStages = (): void => {
      const cup = loadChampionship();
      trackButtons.forEach((item, i) => {
        const result = cup.results.find((r) => r.stage === i);
        const completed = !!result;
        const current = !cup.completed && i === cup.currentStage && !completed;
        const locked = !completed && !current;
        item.disabled = completed || locked;
        item.classList.toggle('locked', locked);
        item.classList.toggle('completed', completed);
        item.setAttribute('aria-disabled', String(item.disabled));
        const status = item.querySelector<HTMLElement>('.rc-stage-status');
        if (status) {
          status.textContent = completed
            ? `✓ CONCLUÍDA · ${result?.playerPlace ?? 8}º · +${result?.standings.find((s) => s.isPlayer)?.points ?? 1} PTS`
            : current
              ? '▶ LIBERADA'
              : '🔒 BLOQUEADA';
        }
      });
    };

    names.forEach((name, i) => {
      const item = el('button', 'rc-summer-track', undefined, summerTracks) as HTMLButtonElement;
      item.type = 'button';
      el('b', '', `ETAPA ${i + 1}`, item);
      el('span', '', name, item);
      el('small', 'rc-stage-status', '', item);
      item.addEventListener('click', (ev) => {
        stop(ev);
        const cup = loadChampionship();
        if (cup.completed || i !== cup.currentStage || cup.results.some((r) => r.stage === i)) return;
        summerPanel.classList.add('hidden');
        chooseSummerTrack(i);
      });
      trackButtons.push(item);
    });
    refreshStages();

    const summerActions = el('div', 'rc-summer-actions', undefined, summerPanel);
    const summerBack = el('button', 'rc-cups-back', '← VOLTAR', summerActions) as HTMLButtonElement;
    summerBack.type = 'button';

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
        refreshStages();
        cups.classList.add('hidden');
        summerPanel.classList.remove('hidden');
      });
    }

    const back = el('button', 'rc-cups-back', '← VOLTAR', cups) as HTMLButtonElement;
    back.type = 'button';
    const settingsPanel = createSettingsPanel(title);
    const settingsBack = settingsPanel.querySelector<HTMLButtonElement>('.rc-cups-back');

    champ.addEventListener('click', (ev) => { stop(ev); setSummer(false); modeMenu.classList.add('hidden'); cups.classList.remove('hidden'); });
    free.addEventListener('click', (ev) => { stop(ev); setSummer(false); requestAnimationFrame(() => title.click()); });
    summerBack.addEventListener('click', (ev) => { stop(ev); setSummer(false); summerPanel.classList.add('hidden'); cups.classList.remove('hidden'); });
    garage.addEventListener('click', (ev) => { stop(ev); const old = garage.textContent; garage.textContent = 'EM BREVE'; setTimeout(() => garage.textContent = old, 900); });
    settings.addEventListener('click', (ev) => { stop(ev); modeMenu.classList.add('hidden'); settingsPanel.classList.remove('hidden'); });
    settingsBack?.addEventListener('click', (ev) => { stop(ev); settingsPanel.classList.add('hidden'); modeMenu.classList.remove('hidden'); });
    back.addEventListener('click', (ev) => { stop(ev); setSummer(false); cups.classList.add('hidden'); modeMenu.classList.remove('hidden'); });

    const oldPrompt = title.querySelector<HTMLElement>('.press-start');
    if (oldPrompt) oldPrompt.style.display = 'none';
    const legend = title.querySelector<HTMLElement>('.controls-legend');
    if (legend) legend.style.display = 'none';
    return true;
  };

  if (tryInstall()) return;
  const observer = new MutationObserver(() => { if (tryInstall()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
}
