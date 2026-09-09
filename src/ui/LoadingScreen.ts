/**
 * Loading overlay shown while a Track is being built. Track name, theme colour
 * band, animated progress bar and rotating tips.
 */
import type { TrackDefinition } from '../core/types';
import { clamp01 } from '../core/math';
import { cssHex, el, TextField } from './dom';

const TIPS: readonly string[] = [
  'Segure DERRAPAGEM (Espaço / Shift) na curva e solte para ganhar mini-turbo. Quanto maior a derrapagem, maior o impulso.',
  'Acelere quando a contagem chegar a 1 para uma largada turbo. Se acelerar cedo demais, o carro vai rodar.',
  'Segure FREIO ao usar um casco para lançá-lo para trás.',
  'Pressione Q para olhar para trás. Veja quem está chegando antes de soltar uma banana.',
  'As faixas de turbo dão um forte impulso de velocidade. Passe por cima delas.',
  'Os itens dependem da sua posição. Quem está atrás recebe itens mais fortes.',
  'A estrela deixa você invencível e destrói obstáculos ao tocar neles.',
  'Fique na pista: fora do asfalto a velocidade máxima cai bastante.',
  'Use um cogumelo na reta longa ou para recuperar velocidade depois de uma batida.',
  'Carros mais pesados empurram os mais leves. Escolha bem sua categoria.',
  'Salte nas elevações para ganhar um pequeno impulso ao aterrissar.',
  'Pressione M para silenciar o áudio a qualquer momento.',
];

const TIP_INTERVAL = 2.4;

export class LoadingScreen {
  private readonly rootNode: HTMLElement;
  private readonly title: TextField;
  private readonly subtitle: TextField;
  private readonly band: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly tipNode: HTMLElement;
  private readonly tipText: TextField;
  private tipTimer = 0;
  private tipIndex = 0;
  private progress = 0;
  private visible = false;

  constructor(root: HTMLElement) {
    this.rootNode = el('div', 'screen loading hidden', undefined, root);
    const panel = el('div', 'loading-panel', undefined, this.rootNode);
    this.band = el('div', 'loading-band', undefined, panel);
    const inner = el('div', 'loading-inner', undefined, panel);
    el('div', 'loading-kicker', 'CARREGANDO', inner);
    this.title = new TextField(el('h2', 'loading-title', '', inner));
    this.subtitle = new TextField(el('div', 'loading-subtitle', '', inner));
    const track = el('div', 'loading-track', undefined, inner);
    this.bar = el('div', 'loading-bar', undefined, track);
    el('div', 'loading-bar-shimmer', undefined, this.bar);
    this.tipNode = el('div', 'loading-tip', undefined, inner);
    el('span', 'loading-tip-label', 'DICA', this.tipNode);
    this.tipText = new TextField(el('span', 'loading-tip-text', '', this.tipNode));
  }

  show(def: TrackDefinition): void {
    this.title.set(def.name.toUpperCase());
    const stars = '★'.repeat(def.difficulty) + '☆'.repeat(3 - def.difficulty);
    this.subtitle.set(`${def.laps} VOLTAS  ·  ${stars}  ·  ${def.theme.toUpperCase()}`);
    const env = def.environment;
    this.band.style.background = `linear-gradient(90deg, ${cssHex(env.skyTop)}, ${cssHex(env.skyHorizon)}, ${cssHex(
      def.palette.road,
    )})`;
    this.tipIndex = Math.floor(Math.random() * TIPS.length);
    this.tipText.set(TIPS[this.tipIndex]);
    this.tipTimer = 0;
    this.setProgress(0);
    this.rootNode.classList.remove('hidden');
    this.visible = true;
  }

  hide(): void {
    this.rootNode.classList.add('hidden');
    this.visible = false;
  }

  setProgress(p: number): void {
    p = clamp01(p);
    if (Math.abs(p - this.progress) < 0.002) return;
    this.progress = p;
    this.bar.style.transform = `scaleX(${p.toFixed(3)})`;
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.tipTimer += dt;
    if (this.tipTimer >= TIP_INTERVAL) {
      this.tipTimer = 0;
      this.tipIndex = (this.tipIndex + 1) % TIPS.length;
      this.tipText.set(TIPS[this.tipIndex]);
      this.tipNode.classList.remove('tip-in');
      void this.tipNode.offsetWidth;
      this.tipNode.classList.add('tip-in');
    }
  }

  dispose(): void {
    this.rootNode.remove();
  }
}
