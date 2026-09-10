/**
 * Post-race results: compact landscape layout, victory celebration,
 * animated coin reward and championship-aware actions.
 */
import type { InputState, RaceSettings, RaceStanding } from '../core/types';
import type { RaceReward } from '../core/progress';
import {
  championshipPoints,
  leaveChampionship,
  loadChampionship,
  nextChampionshipSettings,
  recordChampionshipRace,
} from '../core/championship';
import { events } from '../core/events';
import { formatRaceTime, ordinal } from '../core/math';
import { button, cssHex, el, FocusRing, TextField } from './dom';

const CONFETTI_COUNT = 72;
const CONFETTI_COLORS = ['#ffd23f', '#ff3ab8', '#37a8ff', '#7cff6b', '#ff7a2f', '#ffffff'];
const COIN_ANIM_MS = 1100;

type RuntimeGame = {
  race?: { settings: RaceSettings } | null;
  startRace?: (settings: RaceSettings) => void;
  returnToMenu?: (panel: 'title' | 'characterSelect' | 'trackSelect') => void;
};

function runtimeGame(): RuntimeGame | null {
  return ((window as unknown as { __turboKartRush?: RuntimeGame }).__turboKartRush) ?? null;
}

export class ResultsScreen {
  onRaceAgain: (() => void) | null = null;
  onChangeTrack: (() => void) | null = null;
  onMainMenu: (() => void) | null = null;

  private readonly rootNode: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly kicker: HTMLElement;
  private readonly heading: TextField;
  private readonly subheading: TextField;
  private readonly rewardLine: HTMLElement;
  private readonly rewardAmount: HTMLElement;
  private readonly rewardMeta: HTMLElement;
  private readonly table: HTMLElement;
  private readonly confetti: HTMLElement;
  private readonly focus: FocusRing;
  private readonly againButton: HTMLButtonElement;
  private readonly changeButton: HTMLButtonElement;
  private readonly menuButton: HTMLButtonElement;
  private visible = false;
  private rewardRaf = 0;
  private championshipMode = false;
  private championshipStage = 0;

  constructor(root: HTMLElement) {
    this.rootNode = el('div', 'screen results hidden', undefined, root);
    this.confetti = el('div', 'confetti', undefined, this.rootNode);
    this.panel = el('div', 'glass panel results-panel', undefined, this.rootNode);
    this.kicker = el('div', 'panel-kicker', 'CORRIDA CONCLUÍDA', this.panel);
    this.heading = new TextField(el('h2', 'panel-title results-title', '', this.panel));
    this.subheading = new TextField(el('div', 'results-sub', '', this.panel));

    this.rewardLine = el('div', 'results-reward', undefined, this.panel);
    this.rewardAmount = el('strong', 'results-reward-amount', '', this.rewardLine);
    this.rewardMeta = el('span', 'results-reward-meta', '', this.rewardLine);
    this.rewardLine.style.display = 'none';

    this.table = el('div', 'standings', undefined, this.panel);
    const actions = el('div', 'actions results-actions', undefined, this.panel);
    this.focus = new FocusRing((i) => this.activate(i));
    this.againButton = button('CORRER DE NOVO', 'primary', () => this.activate(0));
    this.changeButton = button('TROCAR PISTA', '', () => this.activate(1));
    this.menuButton = button('MENU', 'ghost', () => this.activate(2));
    actions.append(this.againButton, this.changeButton, this.menuButton);
    this.focus.add(this.againButton);
    this.focus.add(this.changeButton);
    this.focus.add(this.menuButton);
  }

  show(standings: readonly RaceStanding[], reward?: RaceReward | null): void {
    this.cancelRewardAnimation();
    this.table.replaceChildren();
    this.confetti.replaceChildren();

    const player = standings.find((s) => s.isPlayer);
    const place = player ? player.place : standings.length;
    const winnerTime = standings.length > 0 ? standings[0].finishTime : 0;
    const won = place === 1;
    this.championshipMode = sessionStorage.getItem('rc-championship') === 'summer';
    this.championshipStage = Math.max(0, Math.min(2, Number(sessionStorage.getItem('rc-summer-race') ?? '0')));

    if (this.championshipMode) {
      const settings = runtimeGame()?.race?.settings;
      if (settings) recordChampionshipRace(standings, settings);
    }
    const cup = this.championshipMode ? loadChampionship() : null;

    this.kicker.textContent = this.championshipMode
      ? `COPA VERÃO · CORRIDA ${this.championshipStage + 1}/3`
      : (won ? 'VOCÊ VENCEU A CORRIDA' : 'CORRIDA CONCLUÍDA');
    this.heading.set(won ? '🏆 VITÓRIA!' : `${place}º LUGAR`);
    this.subheading.set(
      won
        ? 'Primeiro lugar! Corrida perfeita.'
        : place <= 3
          ? 'Pódio garantido! Excelente corrida.'
          : place <= 5
            ? 'Boa corrida. O pódio está logo ali.'
            : 'Corrida concluída. O campeonato continua!',
    );

    this.panel.classList.toggle('gold', won);
    this.panel.classList.toggle('results-win', won);
    this.panel.classList.toggle('results-podium', place > 1 && place <= 3);
    this.rootNode.classList.toggle('results-victory', won);

    if (reward) {
      const best = reward.isNewBest ? ' · NOVO RECORDE!' : '';
      this.rewardLine.style.display = '';
      this.rewardAmount.textContent = '+0 MOEDAS';
      const pts = this.championshipMode ? ` · +${championshipPoints(place)} PTS` : '';
      this.rewardMeta.textContent = `Total: ${reward.totalCoins}${pts}${best}`;
      requestAnimationFrame(() => this.animateReward(reward.coins, reward.totalCoins, `${pts}${best}`));
    } else {
      this.rewardAmount.textContent = '';
      this.rewardMeta.textContent = '';
      this.rewardLine.style.display = 'none';
    }

    standings.forEach((s, i) => {
      const row = el('div', 'standing-row', undefined, this.table);
      row.style.animationDelay = `${0.1 + i * 0.065}s`;
      if (s.isPlayer) row.classList.add('you');
      if (s.place <= 3) row.classList.add(`podium-${s.place}`);
      el('span', 'standing-place', ordinal(s.place), row);
      const chip = el('span', 'standing-chip', undefined, row);
      chip.style.background = cssHex(s.color);
      const total = cup?.totals?.[s.name] ?? 0;
      const pointsText = this.championshipMode ? ` · +${championshipPoints(s.place)} pts · total ${total}` : '';
      el('span', 'standing-name', s.name + (s.isPlayer ? '  (VOCÊ)' : '') + pointsText, row);
      const t = s.finishTime;
      const label = !isFinite(t) || t <= 0 ? 'NÃO TERMINOU' : i === 0 ? formatRaceTime(t) : `+${(t - winnerTime).toFixed(3)}`;
      el('span', 'standing-time', label, row);
    });

    if (won) this.spawnConfetti();

    if (this.championshipMode) {
      this.againButton.textContent = this.championshipStage >= 2 ? 'COPA CONCLUÍDA' : 'PRÓXIMA CORRIDA';
      this.changeButton.style.display = 'none';
      this.changeButton.disabled = true;
    } else {
      this.againButton.textContent = 'CORRER DE NOVO';
      this.changeButton.textContent = 'TROCAR PISTA';
      this.changeButton.style.display = '';
      this.changeButton.disabled = false;
    }
    this.menuButton.textContent = 'MENU';

    this.focus.set(0);
    this.rootNode.classList.remove('hidden');
    this.panel.classList.remove('panel-in', 'results-pop');
    void this.panel.offsetWidth;
    this.panel.classList.add('panel-in', 'results-pop');
    this.visible = true;
  }

  hide(): void {
    this.cancelRewardAnimation();
    this.rootNode.classList.add('hidden');
    this.rootNode.classList.remove('results-victory');
    this.confetti.replaceChildren();
    this.visible = false;
  }

  handleInput(input: InputState): void {
    if (!this.visible) return;
    if (input.menuLeft || input.menuUp) {
      if (this.focus.move(-1)) events.emit('ui:move', {});
    } else if (input.menuRight || input.menuDown) {
      if (this.focus.move(1)) events.emit('ui:move', {});
    }
    if (input.confirm) this.focus.activate();
    else if (input.back) this.activate(2);
  }

  dispose(): void {
    this.cancelRewardAnimation();
    this.rootNode.remove();
  }

  private activate(i: number): void {
    if (this.championshipMode && i === 1) return;
    events.emit(i === 2 ? 'ui:back' : 'ui:select', {});

    if (i === 0 && this.championshipMode) {
      const game = runtimeGame();
      const settings = game?.race?.settings;
      if (this.championshipStage >= 2) {
        leaveChampionship();
        game?.returnToMenu?.('title');
        return;
      }
      if (settings) {
        const next = nextChampionshipSettings(settings);
        if (next) {
          game?.startRace?.(next);
          return;
        }
      }
      return;
    }

    if (i === 2 && this.championshipMode) {
      leaveChampionship();
      this.onMainMenu?.();
      return;
    }

    if (i === 0) this.onRaceAgain?.();
    else if (i === 1) this.onChangeTrack?.();
    else this.onMainMenu?.();
  }

  private animateReward(coins: number, totalCoins: number, suffix: string): void {
    const start = performance.now();
    const target = Math.max(0, Math.round(coins));
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / COIN_ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const shown = Math.round(target * eased);
      this.rewardAmount.textContent = `+${shown} MOEDAS`;
      if (t < 1 && this.visible) {
        this.rewardRaf = requestAnimationFrame(tick);
      } else {
        this.rewardAmount.textContent = `+${target} MOEDAS`;
        this.rewardMeta.textContent = `Total: ${totalCoins}${suffix}`;
        this.rewardRaf = 0;
      }
    };
    this.rewardRaf = requestAnimationFrame(tick);
  }

  private cancelRewardAnimation(): void {
    if (this.rewardRaf) cancelAnimationFrame(this.rewardRaf);
    this.rewardRaf = 0;
  }

  private spawnConfetti(): void {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const piece = el('span', 'confetti-piece', undefined, this.confetti);
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = `${Math.random() * 1.1}s`;
      piece.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${10 + Math.random() * 10}px`;
    }
  }
}
