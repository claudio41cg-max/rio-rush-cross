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
const TRACK_IDS = ['sunny_circuit', 'dune_drift', 'frostbite_falls', 'neon_nexus', 'coastal_rush', 'summer_beach', 'summer_harbor', 'summer_sunset', 'summer_tropical', 'summer_lighthouse'] as const;

function ensureBadge(): void {
  const title = document.querySelector<HTMLElement>('.panel-title-screen');
  if (!title) return;
  let badge = title.querySelector<HTMLElement>('.coin-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'coin-badge glass';
    title.appendChild(badge);
  }
  badge.textContent = `🪙 ${getCoins()}`;
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
    overlay.innerHTML = '<div class="lock-icon">🔒</div><div class="lock-cost"></div>';
    card.appendChild(overlay);
  }
  const price = overlay.querySelector<HTMLElement>('.lock-cost');
  if (price) price.textContent = `🪙 ${cost}`;
}

function refreshLocks(): void {
  document.querySelectorAll<HTMLElement>('.char-card').forEach((card, index) => {
    const id = CHARACTER_IDS[index];
    if (!id) return;
    card.dataset.progressCharacterId = id;
    ensureLock(card, !isCharacterUnlocked(id), characterUnlockCost(id));
  });
  document.querySelectorAll<HTMLElement>('.track-card').forEach((card, index) => {
    const id = TRACK_IDS[index];
    if (!id) return;
    card.dataset.progressTrackId = id;
    ensureLock(card, !isTrackUnlocked(id), trackUnlockCost(id));
  });
  ensureBadge();
}

function toast(message: string): void {
  let node = document.querySelector<HTMLElement>('.progress-toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'progress-toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
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
    if (unlockCharacter(characterId)) toast(`Carrinho desbloqueado! −${cost} moedas`);
    refreshLocks();
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
    if (unlockTrack(trackId)) toast(`Pista desbloqueada! −${cost} moedas`);
    refreshLocks();
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

function playerPlace(): number {
  const heading = document.querySelector<HTMLElement>('.results-title')?.textContent ?? '';
  if (/VITÓRIA/i.test(heading)) return 1;
  const m = heading.match(/(\d+)/);
  if (m) return Math.max(1, Math.min(8, Number(m[1])));
  const row = document.querySelector<HTMLElement>('.standing-row.you .standing-place')?.textContent ?? '';
  const rm = row.match(/(\d+)/);
  return rm ? Math.max(1, Math.min(8, Number(rm[1]))) : 8;
}

function maybeAwardRace(): void {
  const screen = document.querySelector<HTMLElement>('.screen.results');
  if (!screen || screen.classList.contains('hidden')) {
    if (screen) delete screen.dataset.progressAwarded;
    return;
  }
  if (screen.dataset.progressAwarded === '1') return;
  const reward = awardRace(playerPlace(), selectedDifficulty(), selectedTrackId(), Infinity);
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
    line.textContent = `+${reward.coins} MOEDAS · Total: ${reward.totalCoins}`;
  }
  ensureBadge();
}

function sync(): void {
  refreshLocks();
  maybeAwardRace();
}

document.addEventListener('click', handleLockedClick, true);
window.setInterval(sync, 700);
window.setTimeout(sync, 250);
