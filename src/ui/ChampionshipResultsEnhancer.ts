const PLACE_REWARD = [120, 80, 55, 35, 22, 14, 8, 5] as const;
const DIFFICULTY_MULT: Record<string, number> = { easy: 0.75, normal: 1, hard: 1.4 };

function inSummer(): boolean {
  return sessionStorage.getItem('rc-championship') === 'summer';
}

function currentDifficulty(): string {
  const game = (window as unknown as { __turboKartRush?: { race?: { settings?: { difficulty?: string } } } }).__turboKartRush;
  return game?.race?.settings?.difficulty ?? 'normal';
}

function currentCoins(): number {
  try {
    const raw = localStorage.getItem('rc-rush-progress-v1');
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { coins?: number };
    return Math.max(0, Number(parsed.coins) || 0);
  } catch {
    return 0;
  }
}

function placeFromResults(results: HTMLElement): number {
  const title = results.querySelector<HTMLElement>('.results-title')?.textContent ?? '';
  const m = title.match(/(\d+)/);
  if (m) return Math.max(1, Math.min(8, Number(m[1]) || 8));
  const you = results.querySelector<HTMLElement>('.standing-row.you .standing-place')?.textContent ?? '';
  const n = you.match(/(\d+)/);
  return n ? Math.max(1, Math.min(8, Number(n[1]) || 8)) : 8;
}

function stageIndex(): number {
  const raw = Number(sessionStorage.getItem('rc-summer-race') ?? '0');
  return Math.max(0, Math.min(2, Number.isFinite(raw) ? Math.floor(raw) : 0));
}

function rewardFor(place: number): number {
  const base = PLACE_REWARD[Math.max(0, Math.min(7, place - 1))] ?? 5;
  const mult = DIFFICULTY_MULT[currentDifficulty()] ?? 1;
  return Math.round(base * mult);
}

function animateCoins(amountEl: HTMLElement, amount: number): void {
  const token = String(Date.now());
  amountEl.dataset.animToken = token;
  const start = performance.now();
  const duration = 900;
  const tick = (now: number): void => {
    if (amountEl.dataset.animToken !== token) return;
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    amountEl.textContent = `+${Math.round(amount * eased)} MOEDAS`;
    if (t < 1) requestAnimationFrame(tick);
    else amountEl.textContent = `+${amount} MOEDAS`;
  };
  requestAnimationFrame(tick);
}

function enhance(): void {
  if (!inSummer()) return;
  const results = document.querySelector<HTMLElement>('.results:not(.hidden)');
  if (!results || results.dataset.summerBEnhanced === '1') return;

  const panel = results.querySelector<HTMLElement>('.results-panel');
  if (!panel) return;

  const place = placeFromResults(results);
  const won = place === 1;
  const stage = stageIndex();

  results.dataset.summerBEnhanced = '1';
  results.classList.toggle('results-victory', won);
  panel.classList.toggle('results-win', won);
  panel.classList.toggle('results-podium', place > 1 && place <= 3);
  panel.classList.add('results-summer-b');

  const kicker = panel.querySelector<HTMLElement>('.panel-kicker');
  if (kicker) kicker.textContent = `COPA VERÃO · CORRIDA ${stage + 1}/3`;

  const heading = panel.querySelector<HTMLElement>('.results-title');
  if (heading) heading.textContent = won ? '🏆 VITÓRIA!' : `${place}º LUGAR`;

  const sub = panel.querySelector<HTMLElement>('.results-sub');
  if (sub) {
    sub.textContent = won
      ? 'Primeiro lugar! Corrida perfeita.'
      : place <= 3
        ? 'Pódio garantido! Excelente corrida.'
        : place <= 5
          ? 'Boa corrida. O pódio está logo ali.'
          : 'Quase! Na próxima você chega.';
    sub.style.display = '';
  }

  let reward = panel.querySelector<HTMLElement>('.results-reward');
  if (!reward) {
    reward = document.createElement('div');
    reward.className = 'results-reward';
    const standings = panel.querySelector('.standings');
    panel.insertBefore(reward, standings ?? null);
  }
  reward.style.display = 'flex';
  reward.classList.add('results-reward-force');

  let amount = reward.querySelector<HTMLElement>('.results-reward-amount');
  if (!amount) {
    amount = document.createElement('strong');
    amount.className = 'results-reward-amount';
    reward.prepend(amount);
  }
  let meta = reward.querySelector<HTMLElement>('.results-reward-meta');
  if (!meta) {
    meta = document.createElement('span');
    meta.className = 'results-reward-meta';
    reward.append(meta);
  }

  const rewardCoins = rewardFor(place);
  const total = currentCoins();
  amount.textContent = '+0 MOEDAS';
  meta.textContent = `Total: ${total}`;
  animateCoins(amount, rewardCoins);

  const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('.actions button'));
  if (buttons[0]) buttons[0].textContent = 'TENTAR DE NOVO';
  if (buttons[1]) {
    buttons[1].style.display = '';
    buttons[1].textContent = 'VOLTAR À COPA';
  }
  if (buttons[2]) buttons[2].textContent = 'MENU';
}

export function installChampionshipResultsEnhancer(): void {
  const observer = new MutationObserver(() => {
    const results = document.querySelector<HTMLElement>('.results');
    if (!results || results.classList.contains('hidden')) {
      if (results) delete results.dataset.summerBEnhanced;
      return;
    }
    enhance();
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  enhance();
}
