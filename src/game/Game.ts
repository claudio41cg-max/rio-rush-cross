/**
 * Game: owns the renderer, scene, camera, lights, fixed-step loop and the
 * state machine. This is the only module allowed to import other workstreams'
 * concrete classes; everything is typed against the core interfaces.
 */
import * as THREE from 'three';
import type {
  CharacterDef,
  Difficulty,
  GameState,
  IAIDriver,
  IAudioEngine,
  IItemManager,
  IKart,
  InputState,
  IParticleSystem,
  IPostFX,
  ITrack,
  MusicTrack,
  RaceSettings,
  TrackDefinition,
} from '../core/types';
import { createEmptyInput } from '../core/types';
import { events } from '../core/events';
import { COUNTDOWN_STEP_SECONDS, FIXED_DT, KART_COUNT, MAX_FRAME_DT } from '../core/constants';
import { clamp, clamp01, damp } from '../core/math';
import { awardRace } from '../core/progress';

import { Kart } from '../kart/Kart';
import { InputManager } from '../kart/InputManager';
import { CHARACTERS, getCharacter } from '../kart/roster';
import { Track } from '../track/Track';
import { TRACKS, getTrackDef } from '../track/tracks';
import { ItemManager } from '../items/ItemManager';
import { buildItemIcon } from '../items/itemVisuals';
import { AIDriver } from '../ai/AIDriver';
import { AudioEngine } from '../audio/AudioEngine';
import { ParticleSystem } from '../fx/ParticleSystem';
import { PostFX } from '../fx/PostFX';

import { RaceManager } from './RaceManager';
import { FollowCamera } from './FollowCamera';
import { MenuBackdrop } from './MenuBackdrop';
import type { MenuFraming } from './MenuBackdrop';
import { HUD } from '../ui/HUD';
import { MainMenu } from '../ui/MainMenu';
import type { MenuPanel } from '../ui/MainMenu';
import { ResultsScreen } from '../ui/ResultsScreen';
import { PauseMenu } from '../ui/PauseMenu';
import { LoadingScreen } from '../ui/LoadingScreen';
import { el } from '../ui/dom';
import { showToast } from '../ui/toast';

const MIN_LOADING_SECONDS = 0.8;
const MAX_COMPILE_WAIT_SECONDS = 8;
const RESULTS_DELAY_SECONDS = 1.6;
const MAX_STEPS_PER_FRAME = 8;
const SUN_DISTANCE = 90;
const SHADOW_HALF_EXTENT = 30;
const EMPTY_KARTS: readonly IKart[] = [];

function framingFor(panel: MenuPanel): MenuFraming {
  return panel === 'characterSelect' ? 'characters' : panel === 'trackSelect' ? 'tracks' : 'title';
}

interface PartialRace { track: ITrack | null; karts: IKart[]; items: IItemManager | null; followCamera: FollowCamera | null; hud: HUD | null; }
interface RaceContext {
  settings: RaceSettings; trackDef: TrackDefinition; track: ITrack; karts: IKart[]; aiDrivers: IAIDriver[];
  playerAutoDriver: IAIDriver | null; items: IItemManager; raceManager: RaceManager; followCamera: FollowCamera;
  hud: HUD; sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; fill: THREE.DirectionalLight;
  fog: THREE.FogExp2 | null; background: THREE.Color; unsubs: (() => void)[]; resultsTimer: number;
}

export class Game {
  private readonly container: HTMLElement; private readonly renderer: THREE.WebGLRenderer; private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera; private readonly uiRoot: HTMLElement; private readonly input: InputManager;
  private readonly audio: IAudioEngine; private readonly particles: IParticleSystem; private readonly postfx: IPostFX; private postfxOk = true;
  private readonly backdrop: MenuBackdrop; private readonly mainMenu: MainMenu; private readonly results: ResultsScreen;
  private readonly pauseMenu: PauseMenu; private readonly loading: LoadingScreen; private readonly muteIndicator: HTMLElement;
  private state: GameState = 'boot'; private prePauseState: GameState = 'racing'; private race: RaceContext | null = null;
  private pendingSettings: RaceSettings | null = null; private loadingElapsed = 0; private loadingFrames = 0; private loadingProgress = 0; private shadersReady = false;
  private rafId = 0; private lastTime = -1; private elapsed = 0; private accumulator = 0; private pendingUseItem = false;
  private currentMusic: MusicTrack = 'none'; private audioStarted = false; private disposed = false;
  private readonly playerInput: InputState = createEmptyInput(); private readonly unsubs: (() => void)[] = [];
  private readonly sunDir = new THREE.Vector3(0.4, 0.8, 0.3); private readonly tmpA = new THREE.Vector3(); private readonly tmpB = new THREE.Vector3(); private readonly tmpC = new THREE.Vector3();
  private speedFx = 0; private boostFx = 0; private hitFx = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'game-canvas'; container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200); this.camera.position.set(0, 3, 8); this.scene.add(this.camera);
    this.uiRoot = el('div', '', undefined, container); this.uiRoot.id = 'ui';
    this.input = new InputManager(); this.audio = new AudioEngine(); this.particles = new ParticleSystem(); this.scene.add(this.particles.object); this.postfx = new PostFX();
    try { this.postfx.init(this.renderer, this.scene, this.camera); } catch (err) { console.error('[Game] PostFX init failed, using plain rendering', err); this.postfxOk = false; }
    this.backdrop = new MenuBackdrop();
    this.mainMenu = new MainMenu(this.uiRoot, CHARACTERS as readonly CharacterDef[], TRACKS as readonly TrackDefinition[]);
    this.mainMenu.onHighlight = (id) => this.backdrop.setCharacter(getCharacter(id)); this.mainMenu.onPanelChange = (panel) => this.onMenuPanel(panel); this.mainMenu.onStart = (settings) => this.startRace(settings);
    this.results = new ResultsScreen(this.uiRoot);
    this.results.onRaceAgain = () => { if (this.race) this.startRace(this.race.settings); };
    this.results.onChangeTrack = () => this.returnToMenu('trackSelect'); this.results.onMainMenu = () => this.returnToMenu('title');
    this.pauseMenu = new PauseMenu(this.uiRoot); this.pauseMenu.onResume = () => this.resume();
    this.pauseMenu.onRestart = () => { const settings = this.race?.settings; this.leavePause(); if (settings) this.startRace(settings); else this.returnToMenu('title'); };
    this.pauseMenu.onQuit = () => { this.leavePause(); this.returnToMenu('title'); };
    this.loading = new LoadingScreen(this.uiRoot); this.muteIndicator = el('div', 'mute-indicator', '🔇 MUTED', this.uiRoot);
    window.addEventListener('resize', this.onResize); window.addEventListener('keydown', this.onKeyDown); window.addEventListener('pointerdown', this.onGesture, { passive: true }); window.addEventListener('keydown', this.onGesture); window.addEventListener('blur', this.onBlur); document.addEventListener('visibilitychange', this.onVisibility); this.onResize();
  }

  start(): void { if (this.state !== 'boot') return; this.showMenu('title'); this.lastTime = -1; this.rafId = requestAnimationFrame(this.loop); }
  get currentState(): GameState { return this.state; }
  get inputManager(): InputManager { return this.input; }
  dispose(): void { if (this.disposed) return; this.disposed = true; cancelAnimationFrame(this.rafId); window.removeEventListener('resize', this.onResize); window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('pointerdown', this.onGesture); window.removeEventListener('keydown', this.onGesture); window.removeEventListener('blur', this.onBlur); document.removeEventListener('visibilitychange', this.onVisibility); for (const u of this.unsubs) u(); this.unsubs.length = 0; this.disposeRace(); this.backdrop.detach(this.scene); this.backdrop.dispose(); this.mainMenu.dispose(); this.results.dispose(); this.pauseMenu.dispose(); this.loading.dispose(); this.muteIndicator.remove(); this.input.dispose(); this.safe(() => this.audio.dispose()); this.safe(() => this.particles.dispose()); this.safe(() => this.postfx.dispose()); this.renderer.dispose(); this.renderer.domElement.remove(); this.uiRoot.remove(); }

  private readonly loop = (now: number): void => { if (this.disposed) return; this.rafId = requestAnimationFrame(this.loop); if (this.lastTime < 0) this.lastTime = now; let dt = (now - this.lastTime) / 1000; this.lastTime = now; if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT; if (dt < 0) dt = 0; this.elapsed += dt; const input = this.input.update(); try { this.frame(dt, input); } catch (err) { console.error('[Game] frame error', err); events.emit('ui:error', {}); } };
  private frame(dt: number, input: InputState): void { switch (this.state) { case 'boot': return; case 'title': case 'characterSelect': case 'trackSelect': this.mainMenu.handleInput(input); this.backdrop.update(dt, this.camera); this.particles.update(dt, EMPTY_KARTS, this.camera); this.audio.update(dt, EMPTY_KARTS, -1, this.camera); this.render(dt); return; case 'loading': this.frameLoading(dt); return; case 'countdown': case 'racing': case 'finished': if (input.pause) { this.pause(); this.render(dt); return; } this.simulate(dt, input); this.renderRace(dt, this.state === 'racing' && input.lookBack); return; case 'paused': this.pauseMenu.handleInput(input); if (input.pause && this.state === 'paused') this.resume(); this.render(dt); return; case 'results': this.results.handleInput(input); if (this.race && this.state === 'results') { this.simulate(dt, input); this.renderRace(dt, false); } else this.render(dt); return; } }
  private frameLoading(dt: number): void { this.loading.update(dt); this.loadingElapsed += dt; this.loadingFrames++; if (!this.race && this.loadingFrames >= 2 && this.pendingSettings) { const settings = this.pendingSettings; try { this.buildRace(settings); } catch (err) { console.error('[Game] failed to build race', err); showToast('Could not build the race. Check the console for details.', 'error'); this.pendingSettings = null; this.loading.hide(); this.showMenu('title'); return; } this.warmShaders(); } const ready = this.race !== null && (this.shadersReady || this.loadingElapsed > MAX_COMPILE_WAIT_SECONDS); const target = !this.race ? 0.12 : ready ? 1 : 0.9; this.loadingProgress = damp(this.loadingProgress, target, ready ? 14 : 1.4, dt); this.loading.setProgress(this.loadingProgress); if (this.race && ready) { this.renderRace(dt, false); if (this.loadingElapsed >= MIN_LOADING_SECONDS && this.loadingProgress > 0.985) this.enterCountdown(); } }
  private warmShaders(): void { const r = this.race; this.shadersReady = false; if (!r) return; const renderer = this.renderer as { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> }; if (typeof renderer.compileAsync !== 'function') { this.shadersReady = true; return; } let promise: Promise<unknown>; try { promise = renderer.compileAsync.call(this.renderer, this.scene, this.camera); } catch (err) { console.warn('[Game] compileAsync threw; falling back to synchronous compile', err); this.shadersReady = true; return; } const done = (): void => { if (this.race === r) this.shadersReady = true; }; promise.then(done, (err: unknown) => { console.warn('[Game] compileAsync failed; falling back to synchronous compile', err); done(); }); }
  private simulate(dt: number, input: InputState): void { const r = this.race; if (!r) return; if (input.useItem) this.pendingUseItem = true; this.accumulator += dt; let steps = 0; while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) { this.step(FIXED_DT, r, input, this.pendingUseItem); this.pendingUseItem = false; this.accumulator -= FIXED_DT; steps++; } if (steps >= MAX_STEPS_PER_FRAME) this.accumulator = 0; }
  private step(dt: number, r: RaceContext, input: InputState, useItem: boolean): void { const { track, karts, items } = r; const player = karts[0]; if (r.playerAutoDriver) r.playerAutoDriver.update(dt, track, karts, items, null); else { const p = this.playerInput; p.throttle = input.throttle; p.brake = input.brake; p.steer = input.steer; p.drift = input.drift; p.useItem = useItem; p.useItemHeld = input.useItemHeld; p.lookBack = input.lookBack; p.pause = false; p.confirm = false; p.back = false; p.menuLeft = false; p.menuRight = false; p.menuUp = false; p.menuDown = false; player.setInput(p); } for (let i = 0; i < r.aiDrivers.length; i++) r.aiDrivers[i].update(dt, track, karts, items, player); for (let i = 0; i < karts.length; i++) karts[i].update(dt, track, karts); for (let i = 0; i < karts.length; i++) { const k = karts[i]; const inp = k.input; if (inp.useItem && !k.state.itemRouletteActive && k.state.item !== 'none') items.requestUse(k, inp.brake > 0.5 || inp.lookBack); } items.update(dt); r.raceManager.update(dt); }
  private renderRace(dt: number, lookBack: boolean): void { const r = this.race; if (!r) { this.render(dt); return; } const player = r.karts[0]; for (let i = 0; i < r.karts.length; i++) r.karts[i].updateVisuals(dt); r.track.update(dt, this.elapsed); r.followCamera.update(dt, player, lookBack); this.updateSun(r, player); this.particles.update(dt, r.karts, this.camera); this.audio.update(dt, r.karts, player.state.id, this.camera); r.hud.update(dt, player, r.karts, r.raceManager.raceTime, r.raceManager.totalLaps); this.updatePostFxFeel(dt, player); if (this.state === 'finished' && r.resultsTimer > 0) { r.resultsTimer -= dt; if (r.resultsTimer <= 0) this.enterResults(); } this.render(dt); }
  private render(dt: number): void { if (this.postfxOk) { try { this.postfx.render(dt); return; } catch (err) { console.error('[Game] PostFX render failed; falling back to plain rendering', err); this.postfxOk = false; this.safe(() => this.postfx.setEnabled(false)); } } this.renderer.render(this.scene, this.camera); }
  private updateSun(r: RaceContext, player: IKart): void { const p = player.state.position; const snap = 2; this.tmpA.set(Math.round(p.x / snap) * snap, Math.round(p.y / snap) * snap, Math.round(p.z / snap) * snap); r.sun.target.position.copy(this.tmpA); r.sun.position.copy(this.tmpA).addScaledVector(this.sunDir, SUN_DISTANCE); if (r.fill.visible) { r.fill.position.copy(this.camera.position); r.fill.position.y += 2; r.fill.target.position.copy(p); } }
  private updatePostFxFeel(dt: number, player: IKart): void { if (!this.postfxOk) return; const s = player.state; const top = Math.max(1, player.topSpeed()); const speedTarget = clamp01((Math.abs(s.speed) - top * 0.55) / (top * 0.9)); const boostTarget = s.isBoosting ? clamp01(0.45 + s.boostStrength) : s.isInvincible ? 0.35 : 0; this.speedFx = damp(this.speedFx, speedTarget, 5, dt); this.boostFx = damp(this.boostFx, boostTarget, s.isBoosting ? 12 : 4, dt); if (this.hitFx > 0) { this.hitFx = damp(this.hitFx, 0, 3, dt); if (this.hitFx < 0.005) this.hitFx = 0; } this.postfx.setSpeedEffect(this.speedFx); this.postfx.setBoostEffect(this.boostFx); this.postfx.setHitEffect(this.hitFx); }
  private setState(next: GameState): void { if (next === this.state) return; const from = this.state; this.state = next; this.uiRoot.dataset.state = next; events.emit('game:stateChange', { from, to: next }); }
  private showMenu(panel: MenuPanel): void { this.results.hide(); this.pauseMenu.hide(); this.loading.hide(); this.backdrop.setCharacter(this.mainMenu.highlightedCharacter); this.backdrop.setFraming(framingFor(panel), true); this.backdrop.attach(this.scene, this.camera, this.renderer); this.mainMenu.show(panel); this.setState(panel); this.playMusic('menu'); }
  private onMenuPanel(panel: MenuPanel): void { if (this.state === 'title' || this.state === 'characterSelect' || this.state === 'trackSelect') { this.setState(panel); this.backdrop.setFraming(framingFor(panel)); } }
  private returnToMenu(panel: MenuPanel): void { this.disposeRace(); this.showMenu(panel); }
  private startRace(settings: RaceSettings): void { this.disposeRace(); this.backdrop.detach(this.scene); this.mainMenu.hide(); this.results.hide(); this.pauseMenu.hide(); this.safe(() => this.particles.reset()); let trackDef: TrackDefinition; try { trackDef = getTrackDef(settings.trackId) as TrackDefinition; } catch { trackDef = TRACKS[0] as TrackDefinition; } if (!trackDef) { showToast('No tracks are available yet.', 'error'); this.showMenu('title'); return; } this.pendingSettings = { ...settings, trackId: trackDef.id }; this.loadingElapsed = 0; this.loadingFrames = 0; this.loadingProgress = 0; this.shadersReady = false; this.loading.show(trackDef); this.scene.background = new THREE.Color(0x0b0b1a); this.scene.fog = null; this.setState('loading'); }
  private buildRace(settings: RaceSettings): void { const partial: PartialRace = { track: null, karts: [], items: null, followCamera: null, hud: null }; try { this.buildRaceInner(settings, partial); } catch (err) { const { hud, followCamera, items, karts, track } = partial; if (hud) this.safe(() => hud.dispose()); if (followCamera) this.safe(() => followCamera.dispose()); if (items) this.safe(() => items.dispose()); for (const k of karts) this.safe(() => k.dispose()); if (track) this.safe(() => track.dispose()); throw err; } }

  private buildRaceInner(settings: RaceSettings, partial: PartialRace): void {
    const trackDef = getTrackDef(settings.trackId) as TrackDefinition; const track: ITrack = new Track(trackDef); partial.track = track; const env = trackDef.environment; const karts = partial.karts;
    let playerChar: CharacterDef; try { playerChar = getCharacter(settings.characterId) as CharacterDef; } catch { playerChar = CHARACTERS[0] as CharacterDef; }
    const others = (CHARACTERS as readonly CharacterDef[]).filter((c) => c.id !== playerChar.id); for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = others[i]; others[i] = others[j]; others[j] = t; }
    for (let i = 0; i < KART_COUNT; i++) { const c = i === 0 ? playerChar : others[(i - 1) % others.length]; const k = new Kart(i, c); karts.push(k); this.scene.add(k.object); }
    const startGrid = track.startGrid; for (let i = 0; i < karts.length; i++) { const slot = startGrid[i % Math.max(1, startGrid.length)]; if (slot) { karts[i].reset(slot.position, slot.yaw); } }
    const items = new ItemManager(this.scene, track, karts, buildItemIcon); partial.items = items;
    const raceManager = new RaceManager(track, karts, settings.laps); const aiDrivers: IAIDriver[] = []; for (let i = 1; i < karts.length; i++) aiDrivers.push(new AIDriver(karts[i], settings.difficulty, i));
    const followCamera = new FollowCamera(this.camera); partial.followCamera = followCamera; followCamera.reset(karts[0]); const hud = new HUD(this.uiRoot); partial.hud = hud;
    const sun = new THREE.DirectionalLight(env.sunColor, env.sunIntensity); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -SHADOW_HALF_EXTENT; sun.shadow.camera.right = SHADOW_HALF_EXTENT; sun.shadow.camera.top = SHADOW_HALF_EXTENT; sun.shadow.camera.bottom = -SHADOW_HALF_EXTENT; sun.shadow.camera.near = 1; sun.shadow.camera.far = SUN_DISTANCE * 2; const hemi = new THREE.HemisphereLight(env.skyColor, env.groundColor, env.hemiIntensity); const fill = new THREE.DirectionalLight(0xffffff, env.fillIntensity ?? 0); fill.visible = (env.fillIntensity ?? 0) > 0; this.scene.add(track.object, sun, sun.target, hemi, fill, fill.target);
    const fog = env.fogDensity > 0 ? new THREE.FogExp2(env.fogColor, env.fogDensity) : null; this.scene.background = new THREE.Color(env.skyColor); this.scene.fog = fog;
    const unsubs: (() => void)[] = []; unsubs.push(events.on('race:playerFinished', () => { if (this.race) this.onPlayerFinished(this.race); })); unsubs.push(events.on('kart:hit', ({ kartId }) => { if (kartId === 0) this.hitFx = 1; }));
    this.race = { settings, trackDef, track, karts, aiDrivers, playerAutoDriver: null, items, raceManager, followCamera, hud, sun, hemi, fill, fog, background: new THREE.Color(env.skyColor), unsubs, resultsTimer: RESULTS_DELAY_SECONDS };
    this.pendingSettings = null; this.accumulator = 0; this.pendingUseItem = false;
  }

  private enterCountdown(): void { const r = this.race; if (!r) return; this.loading.hide(); r.hud.show(); const grid = r.track.startGrid; const center = this.tmpA.set(0, 0, 0); const n = Math.min(grid.length, KART_COUNT); if (n > 0) { for (let i = 0; i < n; i++) center.add(grid[i].position); center.multiplyScalar(1 / n); } else center.copy(r.karts[0].state.position); const forward = this.tmpB; r.karts[0].forwardDir(forward); if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1); forward.y = 0; forward.normalize(); const right = this.tmpC.set(-forward.z, 0, forward.x); const from = center.clone().addScaledVector(forward, 18).addScaledVector(right, 11); from.y += 6.5; const look = center.clone(); look.y += 0.8; r.followCamera.setCinematic(from, look, 3 * COUNTDOWN_STEP_SECONDS, 46); r.raceManager.startCountdown(); this.setState('countdown'); this.playMusic('race'); }
  private onPlayerFinished(r: RaceContext): void { if (this.state !== 'racing' && this.state !== 'countdown') return; try { r.playerAutoDriver = new AIDriver(r.karts[0], 'normal', 0); } catch (err) { console.warn('[Game] could not create auto-driver for the player', err); r.playerAutoDriver = null; } if (this.postfxOk) this.safe(() => this.postfx.flash(0xffffff, 0.35)); this.setState('finished'); if (r.raceManager.allFinished) r.resultsTimer = RESULTS_DELAY_SECONDS; }
  private enterResults(): void { const r = this.race; if (!r || this.state === 'results') return; r.hud.hide(); const standings = r.raceManager.getStandings(); const player = standings.find((entry) => entry.isPlayer); const reward = player ? awardRace(player.place, r.settings.difficulty, r.settings.trackId, player.finishTime > 0 ? player.finishTime : Infinity) : null;
    if (player && sessionStorage.getItem('rc-championship') === 'summer') { const stage = Math.max(0, Math.min(2, Number(sessionStorage.getItem('rc-summer-race') ?? '0'))); const unlocked = Math.max(Number(localStorage.getItem('rc-summer-unlocked-stage') ?? '0'), Math.min(2, stage + 1)); localStorage.setItem('rc-summer-unlocked-stage', String(unlocked)); }
    this.results.show(standings, reward); this.setState('results'); this.playMusic('results'); }
  private pause(): void { if (this.state !== 'countdown' && this.state !== 'racing' && this.state !== 'finished') return; this.prePauseState = this.state; this.setState('paused'); this.pauseMenu.show(); events.emit('game:pause', {}); }
  private resume(): void { if (this.state !== 'paused') return; this.pauseMenu.hide(); this.accumulator = 0; this.pendingUseItem = false; this.setState(this.prePauseState); events.emit('game:resume', {}); }
  private leavePause(): void { this.pauseMenu.hide(); if (this.state === 'paused') events.emit('game:resume', {}); }
  private disposeRace(): void { const r = this.race; if (!r) return; this.race = null; for (const u of r.unsubs) u(); r.unsubs.length = 0; this.scene.remove(r.track.object); for (const k of r.karts) this.scene.remove(k.object); this.scene.remove(r.items.object); this.scene.remove(r.sun, r.sun.target, r.hemi, r.fill, r.fill.target); r.sun.dispose(); r.hemi.dispose(); r.fill.dispose(); this.scene.fog = null; this.safe(() => r.items.dispose()); for (const k of r.karts) this.safe(() => k.dispose()); this.safe(() => r.track.dispose()); r.raceManager.dispose(); r.followCamera.dispose(); r.hud.dispose(); this.safe(() => this.particles.reset()); if (this.postfxOk) this.safe(() => { this.postfx.setSpeedEffect(0); this.postfx.setBoostEffect(0); this.postfx.setHitEffect(0); }); this.accumulator = 0; this.pendingUseItem = false; }
  private playMusic(track: MusicTrack): void { this.currentMusic = track; this.safe(() => this.audio.playMusic(track)); }
  private readonly onGesture = (): void => { if (this.audioStarted) return; this.audioStarted = true; window.removeEventListener('pointerdown', this.onGesture); window.removeEventListener('keydown', this.onGesture); this.audio.init().then(() => { if (this.currentMusic !== 'none') this.safe(() => this.audio.playMusic(this.currentMusic)); }).catch((err: unknown) => console.warn('[Game] audio init failed', err)); };
  private readonly onResize = (): void => { const w = Math.max(1, this.container.clientWidth || window.innerWidth); const h = Math.max(1, this.container.clientHeight || window.innerHeight); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); if (this.postfxOk) this.safe(() => this.postfx.resize(w, h)); };
  private readonly onKeyDown = (ev: KeyboardEvent): void => { if (ev.code === 'KeyM') { this.audio.setMuted(!this.audio.muted); this.muteIndicator.classList.toggle('visible', this.audio.muted); } };
  private readonly onBlur = (): void => { if (this.state === 'racing' || this.state === 'countdown') this.pause(); };
  private readonly onVisibility = (): void => { if (document.hidden && (this.state === 'racing' || this.state === 'countdown')) this.pause(); };
  private safe(fn: () => void): void { try { fn(); } catch (err) { console.warn('[Game] non-fatal error', err); } }
}
