from pathlib import Path


def read(p): return Path(p).read_text()
def write(p, s): Path(p).write_text(s)
def once(s, old, new, label):
    if old not in s:
        raise SystemExit(f'Anchor not found: {label}')
    return s.replace(old, new, 1)

# Game.ts
p='src/game/Game.ts'; s=read(p)
if "from '../core/progress'" not in s:
    s=once(s,"import { clamp, clamp01, damp } from '../core/math';\n","import { clamp, clamp01, damp } from '../core/math';\nimport { awardRace } from '../core/progress';\n",'Game progress import')
if 'get inputManager(): InputManager' not in s:
    s=once(s,"  get currentState(): GameState {\n    return this.state;\n  }\n","  get currentState(): GameState {\n    return this.state;\n  }\n\n  get inputManager(): InputManager {\n    return this.input;\n  }\n",'Game inputManager getter')
old="""  private enterResults(): void {
    const r = this.race;
    if (!r || this.state === 'results') return;
    r.hud.hide();
    this.results.show(r.raceManager.getStandings());
    this.setState('results');
    this.playMusic('results');
  }
"""
new="""  private enterResults(): void {
    const r = this.race;
    if (!r || this.state === 'results') return;
    r.hud.hide();
    const standings = r.raceManager.getStandings();
    const player = standings.find((entry) => entry.isPlayer);
    const reward = player
      ? awardRace(
          player.place,
          r.settings.difficulty,
          r.settings.trackId,
          player.finishTime > 0 ? player.finishTime : Infinity,
        )
      : null;
    this.results.show(standings, reward);
    this.setState('results');
    this.playMusic('results');
  }
"""
if old in s: s=s.replace(old,new,1)
elif 'this.results.show(standings, reward);' not in s: raise SystemExit('Anchor not found: Game enterResults')
write(p,s)

# ResultsScreen.ts
p='src/ui/ResultsScreen.ts'; s=read(p)
if "RaceReward" not in s:
    s=once(s,"import type { InputState, RaceStanding } from '../core/types';\n","import type { InputState, RaceStanding } from '../core/types';\nimport type { RaceReward } from '../core/progress';\n",'Results import')
if 'private readonly rewardLine: HTMLElement;' not in s:
    s=once(s,"  private readonly subheading: TextField;\n  private readonly table: HTMLElement;\n","  private readonly subheading: TextField;\n  private readonly rewardLine: HTMLElement;\n  private readonly table: HTMLElement;\n",'Results field')
if "this.rewardLine = el('div', 'results-reward'" not in s:
    s=once(s,"    this.subheading = new TextField(el('div', 'results-sub', '', this.panel));\n    this.table = el('div', 'standings', undefined, this.panel);\n","    this.subheading = new TextField(el('div', 'results-sub', '', this.panel));\n    this.rewardLine = el('div', 'results-reward', '', this.panel);\n    this.rewardLine.style.display = 'none';\n    this.table = el('div', 'standings', undefined, this.panel);\n",'Results reward element')
s=s.replace('  show(standings: readonly RaceStanding[]): void {','  show(standings: readonly RaceStanding[], reward?: RaceReward | null): void {',1)
marker="""    this.panel.classList.toggle('gold', place === 1);

    standings.forEach((s, i) => {
"""
block="""    this.panel.classList.toggle('gold', place === 1);

    if (reward) {
      const best = reward.isNewBest ? ' · NOVO RECORDE!' : '';
      this.rewardLine.textContent = `+${reward.coins} MOEDAS${best} · Total: ${reward.totalCoins}`;
      this.rewardLine.style.display = '';
    } else {
      this.rewardLine.textContent = '';
      this.rewardLine.style.display = 'none';
    }

    standings.forEach((s, i) => {
"""
if marker in s: s=s.replace(marker,block,1)
elif 'reward.totalCoins' not in s: raise SystemExit('Anchor not found: Results reward block')
write(p,s)

# MainMenu.ts
p='src/ui/MainMenu.ts'; s=read(p)
if "from '../core/progress'" not in s:
    s=once(s,"import { button, cssHex, cssRgba, el, TextField } from './dom';\n","import { button, cssHex, cssRgba, el, TextField } from './dom';\nimport { showToast } from './toast';\nimport { canAffordCharacter, canAffordTrack, characterUnlockCost, getCoins, isCharacterUnlocked, isTrackUnlocked, refreshProgress, trackUnlockCost, unlockCharacter, unlockTrack } from '../core/progress';\n",'MainMenu progress import')
if 'private readonly coinBadge: HTMLElement;' not in s:
    s=once(s,"  private visible = false;\n\n  // Character select\n","  private visible = false;\n  private readonly coinBadge: HTMLElement;\n\n  // Character select\n",'MainMenu coin field')
if "this.coinBadge = el('div', 'coin-badge glass'" not in s:
    s=once(s,"    el('div', 'logo-sub', 'CORRIDA SEM LIMITES', title);\n","    el('div', 'logo-sub', 'CORRIDA SEM LIMITES', title);\n    this.coinBadge = el('div', 'coin-badge glass', '', title);\n",'MainMenu coin badge')
old_char="""      card.addEventListener('click', () => {
        if (this.charIndex === i) this.goTo('trackSelect', true);
        else this.setCharacter(i, true);
      });
      card.addEventListener('dblclick', () => this.goTo('trackSelect', true));
"""
new_char="""      card.addEventListener('click', () => {
        if (!isCharacterUnlocked(c.id)) { this.tryUnlockCharacter(c.id); return; }
        if (this.charIndex === i) this.goTo('trackSelect', true);
        else this.setCharacter(i, true);
      });
      card.addEventListener('dblclick', () => {
        if (isCharacterUnlocked(c.id)) this.goTo('trackSelect', true);
        else this.tryUnlockCharacter(c.id);
      });
"""
if old_char in s: s=s.replace(old_char,new_char,1)
old_continue="charActions.appendChild(button('CONTINUAR →', 'primary', () => this.goTo('trackSelect', true)));"
new_continue="""charActions.appendChild(button('CONTINUAR →', 'primary', () => {
      const id = this.characters[this.charIndex]?.id;
      if (id && isCharacterUnlocked(id)) this.goTo('trackSelect', true);
      else if (id) this.tryUnlockCharacter(id);
    }));"""
if old_continue in s: s=s.replace(old_continue,new_continue,1)
old_track="""      card.addEventListener('click', () => {
        if (this.trackIndex === i && this.trackRow === 0) this.start();
        else {
          this.trackRow = 0;
          this.setTrack(i, true);
        }
      });
"""
new_track="""      card.addEventListener('click', () => {
        if (!isTrackUnlocked(t.id)) { this.tryUnlockTrack(t.id); return; }
        if (this.trackIndex === i && this.trackRow === 0) this.start();
        else {
          this.trackRow = 0;
          this.setTrack(i, true);
        }
      });
"""
if old_track in s: s=s.replace(old_track,new_track,1)
segment=s[s.find('show(panel:'):s.find('hide():')]
if 'refreshProgress();' not in segment:
    s=once(s,"  show(panel: MenuPanel = 'title'): void {\n    this.rootNode.classList.remove('hidden');\n","  show(panel: MenuPanel = 'title'): void {\n    refreshProgress();\n    this.refreshCoinBadge();\n    this.refreshLocks();\n    this.rootNode.classList.remove('hidden');\n",'MainMenu show refresh')
start_anchor="""  private start(): void {
    const track = this.tracks[this.trackIndex];
    const character = this.characters[this.charIndex];
    if (!track || !character) return;
"""
start_new="""  private start(): void {
    const track = this.tracks[this.trackIndex];
    const character = this.characters[this.charIndex];
    if (!track || !character) return;
    if (!isCharacterUnlocked(character.id)) { this.tryUnlockCharacter(character.id); return; }
    if (!isTrackUnlocked(track.id)) { this.tryUnlockTrack(track.id); return; }
"""
if start_anchor in s: s=s.replace(start_anchor,start_new,1)
helper_anchor="  private buildCharacterCard(c: CharacterDef): HTMLElement {\n"
helpers="""  private refreshCoinBadge(): void {
    this.coinBadge.textContent = `🪙 ${getCoins()}`;
  }

  private ensureLock(card: HTMLElement, locked: boolean, cost: number): void {
    card.classList.toggle('locked', locked);
    let overlay = card.querySelector<HTMLElement>('.lock-overlay');
    if (!locked) { overlay?.remove(); return; }
    if (!overlay) {
      overlay = el('div', 'lock-overlay', undefined, card);
      el('div', 'lock-icon', '🔒', overlay);
      el('div', 'lock-cost', '', overlay);
    }
    const price = overlay.querySelector<HTMLElement>('.lock-cost');
    if (price) price.textContent = `🪙 ${cost}`;
  }

  private refreshLocks(): void {
    this.charCards.forEach((card, i) => {
      const id = this.characters[i]?.id;
      if (id) this.ensureLock(card, !isCharacterUnlocked(id), characterUnlockCost(id));
    });
    this.trackCards.forEach((card, i) => {
      const id = this.tracks[i]?.id;
      if (id) this.ensureLock(card, !isTrackUnlocked(id), trackUnlockCost(id));
    });
    this.refreshCoinBadge();
  }

  private tryUnlockCharacter(id: string): boolean {
    const cost = characterUnlockCost(id);
    if (!canAffordCharacter(id)) {
      showToast(`Faltam ${Math.max(0, cost - getCoins())} moedas para desbloquear este carrinho.`, 'info', 2200);
      return false;
    }
    const ok = unlockCharacter(id);
    if (ok) { showToast(`Carrinho desbloqueado! −${cost} moedas`, 'info', 2200); this.refreshLocks(); }
    return ok;
  }

  private tryUnlockTrack(id: string): boolean {
    const cost = trackUnlockCost(id);
    if (!canAffordTrack(id)) {
      showToast(`Faltam ${Math.max(0, cost - getCoins())} moedas para desbloquear esta pista.`, 'info', 2200);
      return false;
    }
    const ok = unlockTrack(id);
    if (ok) { showToast(`Pista desbloqueada! −${cost} moedas`, 'info', 2200); this.refreshLocks(); }
    return ok;
  }

  private buildCharacterCard(c: CharacterDef): HTMLElement {
"""
if helper_anchor in s and 'private tryUnlockCharacter' not in s: s=s.replace(helper_anchor,helpers,1)
write(p,s)

# main.ts
p='src/main.ts'; s=read(p)
if "import './progress.css';" not in s:
    s=once(s,"import './mobile-overrides.css';\n","import './mobile-overrides.css';\nimport './progress.css';\n",'main progress css')
old_html='''  <button id="rio-left" class="rio-pad rio-drive"><span class="rio-icon">◀</span><span class="rio-label">ESQUERDA</span></button>
  <button id="rio-right" class="rio-pad rio-drive"><span class="rio-icon">▶</span><span class="rio-label">DIREITA</span></button>
  <button id="rio-item" class="rio-pad rio-item"><span class="rio-icon">★</span><span class="rio-label">ITEM</span></button>
  <button id="rio-brake" class="rio-pad rio-drive"><span class="rio-icon">▼</span><span class="rio-label">FREIO</span></button>
  <button id="rio-gas" class="rio-pad rio-drive"><span class="rio-icon">▲</span><span class="rio-label">ACELERAR</span></button>
'''
new_html='''  <button id="rio-left" class="rio-pad rio-drive"><span class="rio-icon">◀</span><span class="rio-label">ESQ</span></button>
  <button id="rio-right" class="rio-pad rio-drive"><span class="rio-icon">▶</span><span class="rio-label">DIR</span></button>
  <button id="rio-drift" class="rio-pad rio-drift"><span class="rio-icon">↻</span><span class="rio-label">DRIFT</span></button>
  <button id="rio-item" class="rio-pad rio-item"><span class="rio-icon">★</span><span class="rio-label">ITEM</span></button>
  <button id="rio-brake" class="rio-pad rio-drive"><span class="rio-icon">▼</span><span class="rio-label">FREIO</span></button>
  <button id="rio-gas" class="rio-pad rio-drive"><span class="rio-icon">▲</span><span class="rio-label">GAS</span></button>
'''
if old_html in s: s=s.replace(old_html,new_html,1)
old_input="""  const gameWithInput = activeGame as unknown as {
    input?: { setVirtualKey(code: string, active: boolean): void };
  };
  return gameWithInput.input ?? null;
"""
new_input="""  const gameWithInput = activeGame as unknown as {
    inputManager?: { setVirtualKey(code: string, active: boolean): void };
    input?: { setVirtualKey(code: string, active: boolean): void };
  };
  return gameWithInput.inputManager ?? gameWithInput.input ?? null;
"""
if old_input in s: s=s.replace(old_input,new_input,1)
if 'function haptic(' not in s:
    s=once(s,"function setVirtualControl(code: string, active: boolean): void {\n  getVirtualInput()?.setVirtualKey(code, active);\n}\n","function haptic(ms = 12): void {\n  try { if (typeof navigator.vibrate === 'function') navigator.vibrate(ms); } catch { /* ignore */ }\n}\n\nfunction setVirtualControl(code: string, active: boolean): void {\n  getVirtualInput()?.setVirtualKey(code, active);\n}\n",'main haptic')
if "'rio-drift':'Space'" not in s:
    s=s.replace("  'rio-item':'KeyE',\n};","  'rio-item':'KeyE',\n  'rio-drift':'Space',\n};",1)
if "id === 'rio-drift'" not in s:
    s=s.replace("    setVirtualControl(code, true);\n  });","    setVirtualControl(code, true);\n    if (id === 'rio-item' || id === 'rio-drift') haptic(18);\n    else if (id === 'rio-gas') haptic(8);\n  });",1)
write(p,s)

# CSS: keep stable base and add targeted drift/landscape/progress positioning
p='src/mobile-overrides.css'; s=read(p)
extra='''

/* === Safe landscape upgrade: drift + compact HUD === */
#rio-drift {
  right:14px; bottom:92px; width:76px; height:50px; border-radius:14px;
  border-color:rgba(120,210,255,.95);
  background:linear-gradient(180deg,rgba(40,130,210,.96),rgba(18,60,120,.94));
  box-shadow:0 6px 16px rgba(40,140,255,.30),inset 0 1px 0 rgba(255,255,255,.28);
}
#rio-drift:active { background:linear-gradient(180deg,rgba(80,180,255,.98),rgba(30,90,180,.96)); }
#rio-drift .rio-icon { font-size:18px; }
#rio-item { right:94px; }
.char-card,.track-card { position:relative; }
@media (pointer:coarse) and (orientation:landscape) {
  .hud-place { top:10px !important; bottom:auto !important; left:12px !important; }
  .hud-place .place-num { font-size:42px !important; }
  .hud-place .place-suffix { font-size:16px !important; }
  .hud-speed { bottom:8px !important; transform:translateX(-50%) scale(.62) !important; }
  .hud-topright { top:8px !important; right:12px !important; }
  .hud-minimap { top:48px !important; right:10px !important; transform:scale(.58) !important; transform-origin:right top !important; }
}
@media (pointer:coarse) and (orientation:landscape) and (max-height:420px) {
  #rio-drift,#rio-item { bottom:70px; height:46px; }
  #rio-drift { width:68px; }
  #rio-item { width:62px; right:84px; }
}
'''
if 'Safe landscape upgrade: drift + compact HUD' not in s: s += extra
write(p,s)

# remove experimental runtime that caused mobile trouble
q=Path('src/progress-mobile-safe.ts')
if q.exists(): q.unlink()

print('safe updates applied')
