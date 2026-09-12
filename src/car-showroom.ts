import { CHARACTERS } from './kart/roster';
import { getCoins, isCharacterUnlocked, unlockCharacter, characterUnlockCost } from './core/progress';

type MenuRuntime = {
  characters?: Array<{ id?: string; name?: string }>;
  setCharacter?: (index: number, sound?: boolean) => void;
};
type GameRuntime = { mainMenu?: MenuRuntime };

const STOCK_IDS = ['classic_sprint','classic_grip','classic_turbo','classic_heavy'] as const;
const SPECIAL_IDS = new Set(['classic_turbo','classic_heavy']);

function menu(): MenuRuntime | null {
  return ((window as unknown as { __turboKartRush?: GameRuntime }).__turboKartRush?.mainMenu) ?? null;
}

function highlight(id: string): void {
  const m = menu();
  const index = m?.characters?.findIndex((c) => c.id === id) ?? -1;
  if (index >= 0) m?.setCharacter?.(index, true);
}

function makePanel(cls: string, title: string, subtitle: string): HTMLElement {
  const root = document.createElement('section');
  root.className = `rc-car-panel ${cls} hidden`;
  root.innerHTML = `<div class="rc-car-panel-head"><div><small>RC RUSH</small><h2>${title}</h2><p>${subtitle}</p></div><button class="rc-car-close" type="button">← VOLTAR</button></div><div class="rc-car-grid"></div>`;
  return root;
}

function statBars(id: string): string {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) return '';
  const rows = [
    ['VEL', c.stats.speed], ['ACE', c.stats.acceleration], ['DIR', c.stats.handling], ['PESO', c.stats.weight],
  ];
  return `<div class="rc-car-stats">${rows.map(([n,v]) => `<span><b>${n}</b><i><em style="width:${Math.round(Number(v)*100)}%"></em></i></span>`).join('')}</div>`;
}

function makeCard(id: string, mode: 'shop'|'garage'): HTMLButtonElement | null {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) return null;
  const owned = isCharacterUnlocked(id);
  const price = characterUnlockCost(id);
  const special = SPECIAL_IDS.has(id);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `rc-car-card ${owned ? 'owned' : ''} ${special ? 'special' : ''}`;
  const state = owned ? 'NA GARAGEM' : special ? 'CONQUISTA ESPECIAL' : `🪙 ${price}`;
  b.innerHTML = `<div class="rc-car-card-top"><span class="rc-car-dot" style="background:#${c.color.toString(16).padStart(6,'0')}"></span><div><strong>${c.name}</strong><small>${id.startsWith('classic_') ? 'CLÁSSICO ORIGINAL' : 'RC RUSH'}</small></div></div><p>${c.tagline}</p>${statBars(id)}<div class="rc-car-state">${state}</div>`;
  b.addEventListener('pointerenter', () => highlight(id));
  b.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    highlight(id);
    if (mode === 'shop' && !owned && !special) {
      if (unlockCharacter(id)) {
        window.dispatchEvent(new CustomEvent('rc:cars-changed'));
      }
    }
  });
  return b;
}

function render(panel: HTMLElement, mode: 'shop'|'garage'): void {
  const grid = panel.querySelector<HTMLElement>('.rc-car-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const ids = mode === 'shop'
    ? STOCK_IDS.filter((id) => !isCharacterUnlocked(id) || SPECIAL_IDS.has(id))
    : CHARACTERS.filter((c) => isCharacterUnlocked(c.id)).map((c) => c.id);
  ids.forEach((id) => { const card = makeCard(id, mode); if (card) grid.appendChild(card); });
  if (!grid.children.length) grid.innerHTML = '<div class="rc-car-empty">Nenhum carro disponível aqui no momento.</div>';
}

function install(): void {
  const title = document.querySelector<HTMLElement>('.panel-title-screen');
  const modeMenu = title?.querySelector<HTMLElement>('.rc-mode-menu');
  if (!title || !modeMenu) { setTimeout(install, 80); return; }
  if (title.querySelector('.rc-shop-panel')) return;

  const buttons = Array.from(modeMenu.querySelectorAll<HTMLButtonElement>('.rc-mode-btn'));
  const garageButton = buttons.find((b) => (b.textContent ?? '').toUpperCase().includes('GARAGEM'));
  const settingsButton = buttons.find((b) => (b.textContent ?? '').toUpperCase().includes('CONFIGURA'));
  if (!garageButton || !settingsButton) { setTimeout(install, 80); return; }

  garageButton.textContent = '🔧 MINHA GARAGEM';
  const shopButton = document.createElement('button');
  shopButton.type = 'button';
  shopButton.className = 'rc-mode-btn rc-shop-entry';
  shopButton.textContent = '🛒 COMPRAR CARROS';
  modeMenu.querySelector('.rc-mode-buttons')?.insertBefore(shopButton, garageButton);

  const shop = makePanel('rc-shop-panel','COMPRAR CARROS','Modelos para comprar com moedas e carros especiais para conquistar.');
  const garage = makePanel('rc-garage-panel','MINHA GARAGEM','Todos os carros que você já possui ficam guardados aqui.');
  title.append(shop, garage);

  const open = (panel: HTMLElement, mode: 'shop'|'garage') => {
    render(panel, mode);
    modeMenu.classList.add('hidden');
    title.classList.add('rc-car-space');
    panel.classList.remove('hidden');
  };
  const close = (panel: HTMLElement) => {
    panel.classList.add('hidden');
    title.classList.remove('rc-car-space');
    modeMenu.classList.remove('hidden');
  };

  shopButton.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopImmediatePropagation(); open(shop,'shop'); }, true);
  garageButton.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopImmediatePropagation(); open(garage,'garage'); }, true);
  shop.querySelector('.rc-car-close')?.addEventListener('click', () => close(shop));
  garage.querySelector('.rc-car-close')?.addEventListener('click', () => close(garage));
  window.addEventListener('rc:cars-changed', () => { render(shop,'shop'); render(garage,'garage'); });

  const badge = document.createElement('div');
  badge.className = 'rc-menu-coins';
  badge.textContent = `🪙 ${getCoins()}`;
  modeMenu.appendChild(badge);
}
install();
