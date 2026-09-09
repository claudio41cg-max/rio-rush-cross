import { el } from './dom';

const CUPS = [
  { icon: '☀️', name: 'COPA VERÃO', sub: '3 pistas costeiras', state: 'ABERTA', cls: 'summer' },
  { icon: '❄️', name: 'COPA INVERNO', sub: '3 pistas geladas', state: 'EM BREVE', cls: 'winter' },
  { icon: '🌙', name: 'COPA DA NOITE', sub: '3 pistas noturnas', state: 'EM BREVE', cls: 'night' },
  { icon: '🏜️', name: 'COPA DO DESERTO', sub: '3 pistas quentes', state: 'EM BREVE', cls: 'desert' },
  { icon: '🌲', name: 'COPA FLORESTA', sub: '3 pistas verdes', state: 'EM BREVE', cls: 'forest' },
];

function stop(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
}

export function installChampionshipPreview(): void {
  const tryInstall = (): boolean => {
    const title = document.querySelector<HTMLElement>('.panel-title-screen');
    if (!title || title.querySelector('.rc-mode-menu')) return !!title;

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
        modeMenu.classList.remove('hidden');
      });
    }
    const back = el('button', 'rc-cups-back', '← VOLTAR', cups) as HTMLButtonElement;
    back.type = 'button';

    champ.addEventListener('click', (ev) => {
      stop(ev);
      modeMenu.classList.add('hidden');
      cups.classList.remove('hidden');
    });
    free.addEventListener('click', (ev) => {
      stop(ev);
      title.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    for (const b of [garage, settings]) {
      b.addEventListener('click', (ev) => {
        stop(ev);
        const old = b.textContent;
        b.textContent = 'EM BREVE';
        setTimeout(() => (b.textContent = old), 900);
      });
    }
    back.addEventListener('click', (ev) => {
      stop(ev);
      cups.classList.add('hidden');
      modeMenu.classList.remove('hidden');
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
