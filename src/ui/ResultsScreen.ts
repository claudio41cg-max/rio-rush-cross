/**
 * Race results + official championship classification flow.
 * Championship: race celebration -> cup table -> final champion screen.
 */
import type { InputState, RaceSettings, RaceStanding } from '../core/types';
import type { RaceReward } from '../core/progress';
import {
  beginChampionshipStage,
  championshipLeaderboard,
  championshipPoints,
  DIFFICULTY_LABEL,
  getActiveDifficulty,
  leaveChampionship,
  loadChampionship,
  nextChampionshipSettings,
  playerChampionshipRank,
  recordChampionshipRace,
  startOrContinueChampionship,
  SUMMER_TRACKS,
} from '../core/championship';
import { events } from '../core/events';
import { formatRaceTime, ordinal } from '../core/math';
import { button, cssHex, el, FocusRing, TextField } from './dom';

const CONFETTI_COUNT = 72;
const CONFETTI_COLORS = ['#ffd23f', '#ff3ab8', '#37a8ff', '#7cff6b', '#ff7a2f', '#ffffff'];
const COIN_ANIM_MS = 1100;
const TRACK_LABELS: Record<string, string> = {
  summer_beach: 'PRAIA AO MEIO-DIA',
  summer_sunset: 'ORLA DO PÔR DO SOL',
  summer_tropical: 'COSTA TROPICAL',
};

type ChampionshipView = 'race' | 'table' | 'final';

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
  private readonly difficultyBadge: HTMLElement;
  private readonly trackLabel: HTMLElement;
  private readonly heading: TextField;
  private readonly subheading: TextField;
  private readonly rewardLine: HTMLElement;
  private readonly rewardAmount: HTMLElement;
  private readonly rewardMeta: HTMLElement;
  private readonly pointsLine: HTMLElement;
  private readonly contentWrap: HTMLElement;
  private readonly table: HTMLElement;
  private readonly aside: HTMLElement;
  private readonly confetti: HTMLElement;
  private readonly focus: FocusRing;
  private readonly firstButton: HTMLButtonElement;
  private readonly secondButton: HTMLButtonElement;
  private readonly menuButton: HTMLButtonElement;

  private visible = false;
  private rewardRaf = 0;
  private championshipMode = false;
  private championshipStage = 0;
  private championshipView: ChampionshipView = 'race';
  private lastStandings: readonly RaceStanding[] = [];
  private lastReward: RaceReward | null = null;
  private winnerTime = 0;
  private playerPlace = 8;

  constructor(root: HTMLElement) {
    this.rootNode = el('div', 'screen results hidden', undefined, root);
    this.confetti = el('div', 'confetti', undefined, this.rootNode);
    this.panel = el('div', 'glass panel results-panel', undefined, this.rootNode);

    const top = el('div', 'results-topline', undefined, this.panel);
    this.kicker = el('div', 'panel-kicker', 'CORRIDA CONCLUÍDA', top);
    this.difficultyBadge = el('div', 'champ-difficulty-badge', '', top);
    this.difficultyBadge.style.display = 'none';
    this.trackLabel = el('div', 'champ-track-label', '', this.panel);
    this.heading = new TextField(el('h2', 'panel-title results-title', '', this.panel));
    this.subheading = new TextField(el('div', 'results-sub', '', this.panel));

    this.rewardLine = el('div', 'results-reward', undefined, this.panel);
    this.rewardAmount = el('strong', 'results-reward-amount', '', this.rewardLine);
    this.rewardMeta = el('span', 'results-reward-meta', '', this.rewardLine);
    this.rewardLine.style.display = 'none';
    this.pointsLine = el('div', 'champ-points-line', '', this.panel);
    this.pointsLine.style.display = 'none';

    this.contentWrap = el('div', 'champ-content-wrap', undefined, this.panel);
    this.table = el('div', 'standings', undefined, this.contentWrap);
    this.aside = el('aside', 'champ-aside', undefined, this.contentWrap);
    this.aside.style.display = 'none';

    const actions = el('div', 'actions results-actions', undefined, this.panel);
    this.focus = new FocusRing((i) => this.activate(i));
    this.firstButton = button('CORRER DE NOVO', 'primary', () => this.activate(0));
    this.secondButton = button('TROCAR PISTA', '', () => this.activate(1));
    this.menuButton = button('MENU', 'ghost', () => this.activate(2));
    actions.append(this.firstButton, this.secondButton, this.menuButton);
    this.focus.add(this.firstButton);
    this.focus.add(this.secondButton);
    this.focus.add(this.menuButton);
  }

  show(standings: readonly RaceStanding[], reward?: RaceReward | null): void {
    this.cancelRewardAnimation();
    this.confetti.replaceChildren();
    this.lastStandings = standings;
    this.lastReward = reward ?? null;
    this.winnerTime = standings.length > 0 ? standings[0].finishTime : 0;
    const player = standings.find((s) => s.isPlayer);
    this.playerPlace = player?.place ?? standings.length;
    this.championshipMode = sessionStorage.getItem('rc-championship') === 'summer';
    this.championshipStage = Math.max(0, Math.min(2, Number(sessionStorage.getItem('rc-summer-race') ?? '0')));
    this.championshipView = 'race';

    if (this.championshipMode) {
      const settings = runtimeGame()?.race?.settings;
      if (settings) recordChampionshipRace(standings, settings);
      this.renderChampionshipRace();
    } else {
      this.renderFreeRace();
    }

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
    else if (input.back) {
      if (this.championshipMode && this.championshipView !== 'race') this.renderChampionshipRace();
      else this.activate(2);
    }
  }

  dispose(): void {
    this.cancelRewardAnimation();
    this.rootNode.remove();
  }

  private renderChampionshipRace(): void {
    const won = this.playerPlace === 1;
    const difficulty = getActiveDifficulty() ?? runtimeGame()?.race?.settings.difficulty ?? 'normal';
    const currentSettings = runtimeGame()?.race?.settings;
    const trackName = currentSettings ? TRACK_LABELS[currentSettings.trackId] ?? currentSettings.trackId.toUpperCase() : '';
    const player = this.lastStandings.find((s) => s.isPlayer);
    const playerTime = player?.finishTime ?? 0;

    this.championshipView = 'race';
    this.panel.classList.remove('champ-table-view', 'champ-final-view');
    this.panel.classList.add('champ-race-view');
    this.rootNode.classList.toggle('results-victory', won);
    this.panel.classList.toggle('gold', won);
    this.panel.classList.toggle('results-win', won);
    this.panel.classList.toggle('results-podium', this.playerPlace > 1 && this.playerPlace <= 3);

    this.kicker.textContent = `COPA VERÃO · ETAPA ${this.championshipStage + 1}/3`;
    this.difficultyBadge.style.display = '';
    this.difficultyBadge.textContent = `🏁 ${DIFFICULTY_LABEL[difficulty]}`;
    this.trackLabel.style.display = '';
    this.trackLabel.textContent = trackName;
    this.heading.set(won ? '🏆 VITÓRIA!' : `${this.playerPlace}º LUGAR`);
    this.subheading.set(
      won
        ? 'Excelente corrida! Você venceu esta etapa.'
        : this.playerPlace <= 3
          ? 'Pódio garantido! O campeonato continua.'
          : 'Etapa concluída. Cada ponto conta no campeonato!',
    );

    this.table.replaceChildren();
    this.table.style.display = 'none';
    this.aside.replaceChildren();
    this.aside.style.display = 'none';
    this.contentWrap.style.display = 'none';

    if (this.lastReward) {
      const best = this.lastReward.isNewBest ? ' · NOVO RECORDE!' : '';
      this.rewardLine.style.display = '';
      this.rewardAmount.textContent = '+0 MOEDAS';
      this.rewardMeta.textContent = playerTime > 0 && isFinite(playerTime)
        ? `⏱ ${formatRaceTime(playerTime)}${best}`
        : best.replace(' · ', '');
      requestAnimationFrame(() => this.animateReward(this.lastReward!.coins, this.rewardMeta.textContent ?? ''));
    } else {
      this.rewardLine.style.display = 'none';
    }

    this.pointsLine.style.display = '';
    this.pointsLine.innerHTML = `<strong>⭐ +${championshipPoints(this.playerPlace)} PONTOS</strong><span>para o campeonato</span>`;

    this.firstButton.textContent = 'VER CLASSIFICAÇÃO DA COPA';
    this.secondButton.textContent = this.championshipStage >= 2 ? 'VER RESULTADO DA COPA' : 'PRÓXIMA CORRIDA';
    this.menuButton.textContent = 'MENU';
    this.firstButton.style.display = '';
    this.secondButton.style.display = '';
    this.menuButton.style.display = '';
    this.firstButton.disabled = false;
    this.secondButton.disabled = false;

    if (won) this.spawnConfetti();
  }

  private renderChampionshipTable(): void {
    const difficulty = getActiveDifficulty() ?? 'normal';
    const cup = loadChampionship(difficulty);
    const leaderboard = championshipLeaderboard(cup);
    const currentResult = cup.results.find((result) => result.stage === this.championshipStage);

    this.championshipView = 'table';
    this.cancelRewardAnimation();
    this.confetti.replaceChildren();
    this.rootNode.classList.remove('results-victory');
    this.panel.classList.remove('champ-race-view', 'champ-final-view', 'results-win', 'results-podium', 'gold');
    this.panel.classList.add('champ-table-view');

    this.kicker.textContent = '☀️ COPA VERÃO';
    this.difficultyBadge.style.display = '';
    this.difficultyBadge.textContent = `🏁 ${DIFFICULTY_LABEL[difficulty]}`;
    this.trackLabel.style.display = '';
    this.trackLabel.textContent = `CLASSIFICAÇÃO DO CAMPEONATO · APÓS A ETAPA ${this.championshipStage + 1}/3`;
    this.heading.set('CLASSIFICAÇÃO DA COPA');
    this.subheading.set('Pontos da etapa e total acumulado de cada piloto.');
    this.rewardLine.style.display = 'none';
    this.pointsLine.style.display = 'none';
    this.contentWrap.style.display = '';
    this.table.style.display = '';
    this.aside.style.display = '';
    this.buildChampionshipTable(leaderboard, currentResult?.standings ?? []);
    this.buildNextStageAside();

    this.firstButton.textContent = 'VOLTAR AO RESULTADO';
    this.secondButton.textContent = this.championshipStage >= 2 ? 'VER RESULTADO FINAL' : 'PRÓXIMA CORRIDA';
    this.menuButton.textContent = 'MENU';
  }

  private renderChampionshipFinal(): void {
    const difficulty = getActiveDifficulty() ?? 'normal';
    const cup = loadChampionship(difficulty);
    const leaderboard = championshipLeaderboard(cup);
    const rank = playerChampionshipRank(cup);
    const player = leaderboard.find((row) => row.isPlayer);
    const champion = rank === 1;

    this.championshipView = 'final';
    this.cancelRewardAnimation();
    this.confetti.replaceChildren();
    this.panel.classList.remove('champ-race-view', 'champ-table-view', 'results-podium');
    this.panel.classList.add('champ-final-view');
    this.panel.classList.toggle('results-win', champion);
    this.panel.classList.toggle('gold', champion);
    this.rootNode.classList.toggle('results-victory', champion);

    this.kicker.textContent = '☀️ COPA VERÃO · CLASSIFICAÇÃO FINAL';
    this.difficultyBadge.style.display = '';
    this.difficultyBadge.textContent = `🏁 ${DIFFICULTY_LABEL[difficulty]}`;
    this.trackLabel.style.display = '';
    this.trackLabel.textContent = champion ? '🏆 TROFÉU DESBLOQUEADO' : 'CAMPEONATO CONCLUÍDO';
    this.heading.set(champion ? '🏆 CAMPEÃO!' : 'COPA CONCLUÍDA');
    this.subheading.set(
      champion
        ? `1º lugar no campeonato! Você fez ${player?.points ?? 0} pontos e conquistou a Copa Verão.`
        : `${rank}º lugar no campeonato com ${player?.points ?? 0} pontos. Tente outra vez para buscar o troféu!`,
    );

    this.rewardLine.style.display = 'none';
    this.pointsLine.style.display = 'none';
    this.contentWrap.style.display = '';
    this.table.style.display = '';
    this.aside.style.display = '';
    const lastResult = cup.results.find((result) => result.stage === 2);
    this.buildChampionshipTable(leaderboard, lastResult?.standings ?? [], true);
    this.buildFinalAside(rank, player?.points ?? 0, player?.wins ?? 0, difficulty);

    this.firstButton.textContent = 'VER CLASSIFICAÇÃO';
    this.secondButton.textContent = 'JOGAR NOVAMENTE';
    this.menuButton.textContent = 'MENU';

    if (champion) this.spawnConfetti();
  }

  private buildChampionshipTable(
    leaderboard: ReturnType<typeof championshipLeaderboard>,
    raceLines: Array<{ key: string; points: number }>,
    final = false,
  ): void {
    this.table.replaceChildren();
    const header = el('div', 'champ-standing-row champ-standing-head', undefined, this.table);
    el('span', '', 'POS.', header);
    el('span', '', 'PILOTO', header);
    el('span', '', 'PAÍS', header);
    el('span', '', final ? 'VIT.' : 'NESTA CORRIDA', header);
    el('span', '', 'TOTAL', header);

    leaderboard.forEach((row, index) => {
      const line = el('div', 'champ-standing-row', undefined, this.table);
      if (row.isPlayer) line.classList.add('you');
      if (index < 3) line.classList.add(`podium-${index + 1}`);
      el('span', 'champ-pos', `${index + 1}º`, line);
      el('span', 'champ-pilot', `${row.pilotName}${row.isPlayer ? ' (VOCÊ)' : ''}`, line);
      el('span', 'champ-country', row.country, line);
      const earned = raceLines.find((entry) => entry.key === row.key)?.points ?? 0;
      el('span', 'champ-race-points', final ? String(row.wins) : `+${earned}`, line);
      el('strong', 'champ-total-points', String(row.points), line);
    });
  }

  private buildNextStageAside(): void {
    this.aside.replaceChildren();
    if (this.championshipStage >= 2) {
      el('div', 'champ-aside-title', '🏆 ÚLTIMA ETAPA CONCLUÍDA', this.aside);
      el('div', 'champ-aside-big', 'RESULTADO FINAL', this.aside);
      el('p', '', 'Veja quem somou mais pontos e conquistou a Copa Verão.', this.aside);
      return;
    }
    const nextStage = this.championshipStage + 1;
    el('div', 'champ-aside-title', '🏁 PRÓXIMA ETAPA', this.aside);
    el('div', 'champ-next-art', nextStage === 1 ? '🌅' : '🌴', this.aside);
    el('div', 'champ-aside-big', TRACK_LABELS[SUMMER_TRACKS[nextStage]] ?? `ETAPA ${nextStage + 1}`, this.aside);
    el('p', '', `ETAPA ${nextStage + 1}/3 · 3 VOLTAS`, this.aside);
    el('small', '', 'Mesmo carro e mesma dificuldade.', this.aside);
  }

  private buildFinalAside(rank: number, points: number, wins: number, difficulty: keyof typeof DIFFICULTY_LABEL): void {
    this.aside.replaceChildren();
    el('div', 'champ-aside-title', 'RESUMO DA COPA', this.aside);
    const summary = el('div', 'champ-final-summary', undefined, this.aside);
    el('div', '', `🏁 DIFICULDADE  ${DIFFICULTY_LABEL[difficulty]}`, summary);
    el('div', '', '🏎️ ETAPAS  3/3', summary);
    el('div', '', `⭐ VITÓRIAS  ${wins}`, summary);
    el('div', '', `🏆 POSIÇÃO FINAL  ${rank}º`, summary);
    el('div', '', `📊 PONTOS  ${points}`, summary);

    const challenges = el('div', 'champ-next-challenges', undefined, this.aside);
    el('strong', '', '🏆 PRÓXIMOS DESAFIOS', challenges);
    const easy = loadChampionship('easy').cleared;
    const normal = loadChampionship('normal').cleared;
    const hard = loadChampionship('hard').cleared;
    el('span', '', `${easy ? '🏆' : '🔒'} Copa Verão (Fácil)`, challenges);
    el('span', '', `${normal ? '🏆' : '🔒'} Copa Verão (Médio)`, challenges);
    el('span', '', `${hard ? '🏆' : '🔒'} Copa Verão (Difícil)`, challenges);
  }

  private renderFreeRace(): void {
    const won = this.playerPlace === 1;
    this.championshipView = 'race';
    this.panel.classList.remove('champ-race-view', 'champ-table-view', 'champ-final-view');
    this.panel.classList.toggle('gold', won);
    this.panel.classList.toggle('results-win', won);
    this.panel.classList.toggle('results-podium', this.playerPlace > 1 && this.playerPlace <= 3);
    this.rootNode.classList.toggle('results-victory', won);

    this.kicker.textContent = won ? 'VOCÊ VENCEU A CORRIDA' : 'CORRIDA CONCLUÍDA';
    this.difficultyBadge.style.display = 'none';
    this.trackLabel.style.display = 'none';
    this.heading.set(won ? '🏆 VITÓRIA!' : `${this.playerPlace}º LUGAR`);
    this.subheading.set(
      won
        ? 'Primeiro lugar! Corrida perfeita.'
        : this.playerPlace <= 3
          ? 'Pódio garantido! Excelente corrida.'
          : this.playerPlace <= 5
            ? 'Boa corrida. O pódio está logo ali.'
            : 'Quase! Na próxima você chega.',
    );

    if (this.lastReward) {
      const best = this.lastReward.isNewBest ? ' · NOVO RECORDE!' : '';
      this.rewardLine.style.display = '';
      this.rewardAmount.textContent = '+0 MOEDAS';
      this.rewardMeta.textContent = `Total: ${this.lastReward.totalCoins}${best}`;
      requestAnimationFrame(() => this.animateReward(this.lastReward!.coins, this.rewardMeta.textContent ?? ''));
    } else {
      this.rewardLine.style.display = 'none';
    }
    this.pointsLine.style.display = 'none';
    this.contentWrap.style.display = '';
    this.table.style.display = '';
    this.aside.style.display = 'none';
    this.buildFreeRaceTable();

    this.firstButton.textContent = 'CORRER DE NOVO';
    this.secondButton.textContent = 'TROCAR PISTA';
    this.menuButton.textContent = 'MENU';
    if (won) this.spawnConfetti();
  }

  private buildFreeRaceTable(): void {
    this.table.replaceChildren();
    this.lastStandings.forEach((standing, index) => {
      const row = el('div', 'standing-row', undefined, this.table);
      row.style.animationDelay = `${0.1 + index * 0.065}s`;
      if (standing.isPlayer) row.classList.add('you');
      if (standing.place <= 3) row.classList.add(`podium-${standing.place}`);
      el('span', 'standing-place', ordinal(standing.place), row);
      const chip = el('span', 'standing-chip', undefined, row);
      chip.style.background = cssHex(standing.color);
      el('span', 'standing-name', standing.name + (standing.isPlayer ? '  (VOCÊ)' : ''), row);
      const time = standing.finishTime;
      const label = !isFinite(time) || time <= 0
        ? 'NÃO TERMINOU'
        : index === 0
          ? formatRaceTime(time)
          : `+${(time - this.winnerTime).toFixed(3)}`;
      el('span', 'standing-time', label, row);
    });
  }

  private activate(i: number): void {
    events.emit(i === 2 ? 'ui:back' : 'ui:select', {});

    if (!this.championshipMode) {
      if (i === 0) this.onRaceAgain?.();
      else if (i === 1) this.onChangeTrack?.();
      else this.onMainMenu?.();
      return;
    }

    if (i === 2) {
      leaveChampionship();
      this.onMainMenu?.();
      return;
    }

    if (this.championshipView === 'race') {
      if (i === 0) {
        this.renderChampionshipTable();
        this.focus.set(0);
        return;
      }
      if (i === 1) {
        if (this.championshipStage >= 2) this.renderChampionshipFinal();
        else this.startNextChampionshipRace();
        this.focus.set(0);
      }
      return;
    }

    if (this.championshipView === 'table') {
      if (i === 0) {
        this.renderChampionshipRace();
        this.focus.set(0);
        return;
      }
      if (i === 1) {
        if (this.championshipStage >= 2) this.renderChampionshipFinal();
        else this.startNextChampionshipRace();
        this.focus.set(0);
      }
      return;
    }

    // Final championship screen.
    if (i === 0) {
      this.renderChampionshipTable();
      this.focus.set(0);
      return;
    }
    if (i === 1) {
      const game = runtimeGame();
      const settings = game?.race?.settings;
      const difficulty = getActiveDifficulty();
      if (!settings || !difficulty) return;
      startOrContinueChampionship(difficulty);
      if (!beginChampionshipStage(0)) return;
      game?.startRace?.({ ...settings, trackId: SUMMER_TRACKS[0], difficulty });
    }
  }

  private startNextChampionshipRace(): void {
    const game = runtimeGame();
    const settings = game?.race?.settings;
    if (!settings) return;
    const next = nextChampionshipSettings(settings);
    if (next) game?.startRace?.(next);
  }

  private animateReward(coins: number, meta: string): void {
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
        this.rewardMeta.textContent = meta;
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
    this.confetti.replaceChildren();
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
