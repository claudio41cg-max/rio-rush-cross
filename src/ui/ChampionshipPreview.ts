import { el } from './dom';

const SUMMER_TRACK_NAMES = ['PRAIA AO MEIO-DIA', 'ORLA DO PÔR DO SOL', 'COSTA TROPICAL'];
const RACE_SONGS = ['SUMMER DRIVE', 'BEACH RUNNERS', 'SUNSET RACE', 'TROPICAL VIBES', 'NIGHT SPEED'];

const CUPS = [
  { icon: '☀️', name: 'COPA VERÃO', sub: '3 pistas costeiras', state: 'ABERTA', cls: 'summer' },
  { icon: '❄️', name: 'COPA INVERNO', sub: '3 pistas geladas', state: 'BLOQUEADA', cls: 'winter' },
  { icon: '🌙', name: 'COPA DA NOITE', sub: '3 pistas noturnas', state: 'BLOQUEADA', cls: 'night' },
  { icon: '🏜️', name: 'COPA DO DESERTO', sub: '3 pistas quentes', state: 'BLOQUEADA', cls: 'desert' },
  { icon: '🌲', name: 'COPA FLORESTA', sub: '3 pistas verdes', state: 'BLOQUEADA', cls: 'forest' },
];

function stop(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
}

function isSummerMode(): boolean {
  return sessionStorage.getItem('rc-championship') === 'summer';
}

function summerIndex(): number {
  const n = Number(sessionStorage.getItem('rc-summer-race') ?? '0');
  return Math.max(0, Math.min(2, Number.isFinite(n) ? Math.floor(n) : 0));
}

function setSummerIndex(i: number): void {
  sessionStorage.setItem('rc-summer-race', String(Math.max(0, Math.min(2, i))));
}

function setSummerMode(enabled: boolean): void {
  document.body.classList.toggle('rc-summer-active', enabled);
  if (enabled) {
    sessionStorage.setItem('rc-championship', 'summer');
  } else {
    sessionStorage.removeItem('rc-championship');
    sessionStorage.removeItem('rc-summer-race');
  }
}

function trackCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.panel-tracks .track-card'));
}

function trackName(card: HTMLElement): string {
  return card.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase() ?? '';
}

function applySummerTrackFilter(): void {
  if (!isSummerMode()) return;
  for (const card of trackCards()) {
    card.style.display = SUMMER_TRACK_NAMES.includes(trackName(card)) ? '' : 'none';
  }
  const title = document.querySelector<HTMLElement>('.panel-tracks .panel-title');
  if (title) title.textContent = 'COPA VERÃO · ESCOLHA A CORRIDA';
}

function clearTrackFilter(): void {
  for (const card of trackCards()) card.style.display = '';
  const title = document.querySelector<HTMLElement>('.panel-tracks .panel-title');
  if (title) title.textContent = 'ESCOLHA UM CIRCUITO';
}

function rememberSelectedSummerTrack(ev: Event): void {
  if (!isSummerMode()) return;
  const target = ev.target as HTMLElement | null;
  const card = target?.closest<HTMLElement>('.panel-tracks .track-card');
  if (!card) return;
  const idx = SUMMER_TRACK_NAMES.indexOf(trackName(card));
  if (idx >= 0) setSummerIndex(idx);
}

function adaptResults(): void {
  if (!isSummerMode()) return;
  const results = document.querySelector<HTMLElement>('.results:not(.hidden)');
  if (!results) return;
  const buttons = Array.from(results.querySelectorAll<HTMLButtonElement>('.actions button'));
  if (buttons.length < 3) return;
  const index = summerIndex();
  buttons[0].textContent = 'JOGAR NOVAMENTE';
  buttons[1].style.display = '';
  buttons[1].textContent = 'VOLTAR À COPA VERÃO';
  buttons[2].textContent = 'MENU PRINCIPAL';
  const kicker = results.querySelector<HTMLElement>('.panel-kicker');
  if (kicker) kicker.textContent = `COPA VERÃO · CORRIDA ${index + 1}/3`;
}

function installResultGuard(): void {
  document.addEventListener('click', (ev) => {
    if (!isSummerMode()) return;
    const target = ev.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('.results .actions button');
    if (!btn) return;
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.results .actions button'));
    const i = buttons.indexOf(btn);
    if (i === 1) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const menuButton = buttons[2];
      setTimeout(() => menuButton?.click(), 0);
      return;
    }
    if (i === 2) {
      setSummerMode(false);
      clearTrackFilter();
    }
  }, true);
}

function createSettingsPanel(title: HTMLElement): HTMLElement {
  const panel = el('div', 'rc-settings hidden', undefined, title);
  el('div', 'rc-cups-kicker', 'CONFIGURAÇÕES', panel);
  el('div', 'rc-cups-title', 'ÁUDIO DA CORRIDA', panel);

  const volumeRow = el('div', 'rc-setting-row', undefined, panel);
  el('label', '', '🎵 VOLUME DA MÚSICA', volumeRow);
  const volume = document.createElement('input');
  volume.type = 'range';
  volume.min = '10';
  volume.max = '100';
  volume.step = '5';
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
  const musicButtons: HTMLButtonElement[] = [];
  RACE_SONGS.forEach((name, i) => {
    const b = el('button', 'rc-music-choice', `${i + 1}. ${name}`, list) as HTMLButtonElement;
    b.type = 'button';
    b.classList.toggle('selected', i === selected);
    b.addEventListener('click', (ev) => {
      stop(ev);
      selected = i;
      localStorage.setItem('rc-race-song', String(i));
      musicButtons.forEach((x, k) => x.classList.toggle('selected', k === selected));
    });
    musicButtons.push(b);
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

    if (isSummerMode()) document.body.classList.add('rc-summer-active');

    const modeMenu = el('div', 'rc-mode-menu', undefined, title);
    const modeTitle = el('div', 'rc-mode-title', 'ESCOLHA O MODO', modeMenu);
    modeTitle.setAttribute('aria-hidden', 'true');

    const row = el('div', 'rc-mode-buttons', undefined, modeMenu);
    const champ = el('button', 'rc-mode-btn rc-mode-primary', '🏆 CAMPEONATO', row) as HTMLButtonElement;
    const free = el('button', 'rc-mode-btn', '🏁 CORRIDA LIVRE', row) as HTMLButtonElement;
    const garage = el('button', 'rc-mode-btn', '🔧 GARAGEM', row) as HTMLButtonElement;
    const settings = el('button', 'rc-mode-btn', '⚙ CONFIGURAÇÕES', row) as HTMLButtonElement;
    [champ, free, garage, settings].forEach((b) => (b.type = 'button'));

    const cups = el('div', 'rc-cups hidden', undefined, title);
    const head = el('div', 'rc-cups-head', undefined, cups);
    el('div', 'rc-cups-kicker', 'MODO CAMPEONATO', head);
    el('div', 'rc-cups-title', 'ESCOLHA SUA COPA', head);
    const cards = el('div', 'rc-cup-grid', undefined, cups);

    const summerPanel = el('div', 'rc-summer-cup hidden', undefined, title);
    el('div', 'rc-cups-kicker', 'COPA VERÃO', summerPanel);
    el('div', 'rc-cups-title', '3 CORRIDAS · SOL, PRAIA E VELOCIDADE', summerPanel);
    const summerTracks = el('div', 'rc-summer-track-list', undefined, summerPanel);
    ['☀️ Praia ao Meio-Dia', '🌅 Orla do Pôr do Sol', '🌴 Costa Tropical'].forEach((name, i) => {
      const item = el('div', 'rc-summer-track', undefined, summerTracks);
      el('b', '', `${i + 1}`, item);
      el('span', '', name, item);
    });

    const summerActions = el('div', 'rc-summer-actions', undefined, summerPanel);
    const summerBack = el('button', 'rc-cups-back', '← VOLTAR', summerActions) as HTMLButtonElement;
    const summerStart = el('button', 'rc-mode-btn rc-mode-primary rc-summer-start', 'COMEÇAR COPA VERÃO', summerActions) as HTMLButtonElement;
    summerBack.type = 'button';
    summerStart.type = 'button';

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
        cups.classList.add('hidden');
        summerPanel.classList.remove('hidden');
      });
    }

    const back = el('button', 'rc-cups-back', '← VOLTAR', cups) as HTMLButtonElement;
    back.type = 'button';
    const settingsPanel = createSettingsPanel(title);
    const settingsBack = settingsPanel.querySelector<HTMLButtonElement>('.rc-cups-back');

    champ.addEventListener('click', (ev) => {
      stop(ev);
      modeMenu.classList.add('hidden');
      cups.classList.remove('hidden');
    });

    free.addEventListener('click', (ev) => {
      stop(ev);
      setSummerMode(false);
      clearTrackFilter();
      requestAnimationFrame(() => title.click());
    });

    summerBack.addEventListener('click', (ev) => {
      stop(ev);
      summerPanel.classList.add('hidden');
      cups.classList.remove('hidden');
    });

    summerStart.addEventListener('click', (ev) => {
      stop(ev);
      setSummerMode(true);
      sessionStorage.removeItem('rc-summer-race');
      summerPanel.classList.add('hidden');
      requestAnimationFrame(() => title.click());
    });

    garage.addEventListener('click', (ev) => {
      stop(ev);
      const old = garage.textContent;
      garage.textContent = 'EM BREVE';
      setTimeout(() => (garage.textContent = old), 900);
    });

    settings.addEventListener('click', (ev) => {
      stop(ev);
      modeMenu.classList.add('hidden');
      settingsPanel.classList.remove('hidden');
    });

    settingsBack?.addEventListener('click', (ev) => {
      stop(ev);
      settingsPanel.classList.add('hidden');
      modeMenu.classList.remove('hidden');
    });

    back.addEventListener('click', (ev) => {
      stop(ev);
      cups.classList.add('hidden');
      modeMenu.classList.remove('hidden');
    });

    document.addEventListener('click', rememberSelectedSummerTrack, true);
    installResultGuard();

    const observer = new MutationObserver(() => {
      if (isSummerMode()) {
        document.body.classList.add('rc-summer-active');
        if (document.querySelector('.panel-tracks.active')) applySummerTrackFilter();
        adaptResults();
      }
    });
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class'],
    });

    const oldPrompt = title.querySelector<HTMLElement>('.press-start');
    if (oldPrompt) oldPrompt.style.display = 'none';
    const legend = title.querySelector<HTMLElement>('.controls-legend');
    if (legend) legend.style.display = 'none';
    return true;
  };

  if (tryInstall()) return;
  const observer = new MutationObserver(() => {
    if (tryInstall()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
