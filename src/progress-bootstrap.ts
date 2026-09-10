import {
  awardRace,
  canAffordCharacter,
  canAffordTrack,
  characterUnlockCost,
  getCoins,
  isCharacterUnlocked,
  isTrackUnlocked,
  trackUnlockCost,
  unlockCharacter,
  unlockTrack,
} from './core/progress';

const CHARACTER_IDS = ['zippy', 'pixel', 'fennec', 'max', 'juno', 'kai', 'bram', 'rosa'] as const;
const TRACK_IDS = [
  'sunny_circuit',
  'dune_drift',
  'frostbite_falls',
  'neon_nexus',
  'coastal_rush',
  'summer_beach',
  'summer_sunset',
  'summer_tropical',
] as const;

function coinBadge(): HTMLElement | null {
  const title = document.querySelector<HTMLElement>('.panel-title-screen');
  if (!title) return null;
  let badge = title.querySelector<HTMLElement>('.coin-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'coin-badge glass';
    title.appendChild(badge);
  }
  return badge;
}

function refreshCoins(): void {
  const badge = coinBadge();
  if (badge) badge.textContent = `🪙 ${getCoins()}`;
}

function ensureLock(card: HTMLElement, locked: boolean, cost: number): void {
  card.classList.toggle('locked', locked);
  let overlay = card.querySelector<HTMLElement>('.lock-overlay');
  if (!locked) {
    overlay?.remove();
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lock-overlay';
    const icon = document.createElement('div');
    icon.className = 'lock-icon';
    icon.textContent = '🔒';
    const price = document.createElement('div');
    price.className = 'lock-cost';
    overlay.append(icon, price);
    card.appendChild(overlay);
  }
  const price = overlay.querySelector<HTMLElement>('.lock-cost');
  if (price) price.textContent = `🪙 ${cost}`;
}

function refreshLocks(): void {
  document.querySelectorAll<HTMLElement>('.char-card').forEach((card, index) => {
    const id = CHARACTER_IDS[index];
    if (!id) return;
    ensureLock(card, !isCharacterUnlocked(id), characterUnlockCost(id));
    card.dataset.progressCharacterId = id;
  });

  document.querySelectorAll<HTMLElement>('.track-card').forEach((card, index) => {
    const id = TRACK_IDS[index];
    if (!id) return;
    ensureLock(card, !isTrackUnlocked(id), trackUnlockCost(id));
    card.dataset.progressTrackId = id;
  });
  refreshCoins();
}

function toast(message: string): void {
  let node = document.querySelector<HTMLElement>('.progress-toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'progress-toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.remove('show');
  void node.offsetWidth;
  node.classList.add('show');
  window.setTimeout(() => node?.classList.remove('show'), 1800);
}

function handleLockedClick(event: Event): void {
  const target = event.target as Element | null;
  const card = target?.closest<HTMLElement>('.card.locked');
  if (!card) return;

  const characterId = card.dataset.progressCharacterId;
  const trackId = card.dataset.progressTrackId;

  if (characterId) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const cost = characterUnlockCost(characterId);
    if (!canAffordCharacter(characterId)) {
      toast(`Faltam ${cost - getCoins()} moedas para desbloquear este carrinho.`);
      return;
    }
    if (unlockCharacter(characterId)) {
      toast(`Carrinho desbloqueado! −${cost} moedas`);
      refreshLocks();
    }
    return;
  }

  if (trackId) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const cost = trackUnlockCost(trackId);
    if (!canAffordTrack(trackId)) {
      toast(`Faltam ${cost - getCoins()} moedas para desbloquear esta pista.`);
      return;
    }
    if (unlockTrack(trackId)) {
      toast(`Pista desbloqueada! −${cost} moedas`);
      refreshLocks();
    }
  }
}

function selectedTrackId(): string {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.track-card'));
  const index = cards.findIndex((card) => card.classList.contains('selected'));
  return TRACK_IDS[index] ?? 'sunny_circuit';
}

function selectedDifficulty(): string {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.difficulty .seg'));
  const index = buttons.findIndex((button) => button.classList.contains('selected'));
  return index === 0 ? 'easy' : index === 2 ? 'hard' : 'normal';
}

function parseTime(text: string): number {
  const clean = text.trim().replace(',', '.');
  const match = clean.match(/^(?:(\d+):)?(\d+)(?:\.(\d+))?$/);
  if (!match) return Infinity;
  const minutes = Number(match[1] ?? 0);
  const seconds = Number(match[2] ?? 0);
  const fraction = Number(`0.${match[3] ?? 0}`);
  const total = minutes * 60 + seconds + fraction;
  return Number.isFinite(total) && total > 0 ? total : Infinity;
}

function playerFinishTime(): number {
  const winnerText = document.querySelector<HTMLElement>('.standing-row:first-child .standing-time')?.textContent?.trim() ?? '';
  const playerText = document.querySelector<HTMLElement>('.standing-row.you .standing-time')?.textContent?.trim() ?? '';
  const winner = parseTime(winnerText);
  if (!playerText || playerText.includes('NÃO TERMINOU')) return Infinity;
  if (playerText.startsWith('+')) {
    const delta = Number(playerText.slice(1).replace(',', '.'));
    return Number.isFinite(winner) && Number.isFinite(delta) ? winner + delta : Infinity;
  }
  return parseTime(playerText);
}

function playerPlace(): number {
  const heading = document.querySelector<HTMLElement>('.results-title')?.textContent?.trim() ?? '';
  if (/VITÓRIA/i.test(heading)) return 1;
  const match = heading.match(/(\d+)/);
  if (match) return Math.max(1, Math.min(8, Number(match[1])));
  const row = document.querySelector<HTMLElement>('.standing-row.you .standing-place')?.textContent ?? '';
  const rowMatch = row.match(/(\d+)/);
  return rowMatch ? Math.max(1, Math.min(8, Number(rowMatch[1]))) : 8;
}

function showReward(): void {
  const screen = document.querySelector<HTMLElement>('.screen.results');
  if (!screen || screen.classList.contains('hidden')) {
    if (screen) delete screen.dataset.progressAwarded;
    return;
  }
  if (screen.dataset.progressAwarded === '1') return;

  const place = playerPlace();
  const reward = awardRace(place, selectedDifficulty(), selectedTrackId(), playerFinishTime());
  screen.dataset.progressAwarded = '1';

  const panel = screen.querySelector<HTMLElement>('.results-panel');
  const sub = panel?.querySelector<HTMLElement>('.results-sub');
  if (panel && sub) {
    let line = panel.querySelector<HTMLElement>('.results-reward');
    if (!line) {
      line = document.createElement('div');
      line.className = 'results-reward';
      sub.insertAdjacentElement('afterend', line);
    }
    const best = reward.isNewBest ? ' · NOVO RECORDE!' : '';
    line.textContent = `+${reward.coins} MOEDAS${best} · Total: ${reward.totalCoins}`;
  }
  refreshCoins();
}

function sync(): void {
  refreshLocks();
  showReward();
}

function start(): void {
  document.addEventListener('click', handleLockedClick, true);
  sync();
  const observer = new MutationObserver(() => sync());
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
