// Copa Verão: fluxo progressivo + layout oficial em paisagem.
const isSummer = () => sessionStorage.getItem('rc-championship') === 'summer';
const raceIndex = () => Math.max(0, Math.min(2, Number(sessionStorage.getItem('rc-summer-race') ?? '0')));
const SUMMER_TRACK_IDS = ['summer_beach', 'summer_sunset', 'summer_tropical'] as const;

function completedRace(i: number): boolean {
  return localStorage.getItem(`rc-summer-completed-${i}`) === '1' || Number(localStorage.getItem(`rc-summer-points-${i}`) ?? '0') > 0;
}
function unlockedRace(i: number): boolean { return i === 0 || completedRace(i - 1); }
function visibleTrackPanel(): HTMLElement | null { return document.querySelector<HTMLElement>('.panel-tracks.active'); }
function hideConfirmation(): void {
  document.querySelectorAll<HTMLElement>('.rc-summer-confirm').forEach(confirm => {
    confirm.classList.add('hidden'); confirm.style.display = 'none'; confirm.style.pointerEvents = 'none';
  });
}
function startSelectedSummerRace(index: number): boolean {
  const game = (window as unknown as { __turboKartRush?: unknown }).__turboKartRush as any;
  const menu = game?.mainMenu as any;
  if (!menu || !Array.isArray(menu.tracks)) return false;
  const exactIndex = menu.tracks.findIndex((track: { id?: string }) => track?.id === SUMMER_TRACK_IDS[index]);
  if (exactIndex < 0) return false;
  menu.trackIndex = exactIndex; menu.trackRow = 0;
  if (Array.isArray(menu.trackCards)) menu.trackCards.forEach((card: HTMLElement, i: number) => {
    card.classList.toggle('selected', i === exactIndex); card.classList.toggle('focused', i === exactIndex);
  });
  if (typeof menu.start !== 'function') return false;
  menu.start(); return true;
}
function unlockStarterCars(): void {
  const panel = document.querySelector<HTMLElement>('.panel-chars.active'); if (!panel || !isSummer()) return;
  const cards = Array.from(panel.querySelectorAll<HTMLElement>('.char-card')); if (!cards.length) return;
  cards.forEach((card, i) => {
    const locked = i >= 2; card.classList.toggle('rc-car-locked', locked); card.setAttribute('aria-disabled', locked ? 'true' : 'false');
    if (locked) { card.style.pointerEvents='none'; if(!card.querySelector('.rc-lock-badge')){const badge=document.createElement('span');badge.className='rc-lock-badge';badge.textContent='🔒 BLOQUEADO';card.appendChild(badge);} }
    else { card.style.pointerEvents=''; card.querySelector('.rc-lock-badge')?.remove(); }
  });
  const selected=cards.findIndex(c=>c.classList.contains('selected')); if(selected>=2) cards[0]?.click();
}
function refreshSummerProgress(): void {
  const panel=document.querySelector<HTMLElement>('.rc-summer-cup'); if(!panel) return;
  const cards=Array.from(panel.querySelectorAll<HTMLButtonElement>('.rc-summer-track-card'));
  cards.forEach((card,i)=>{
    const open=unlockedRace(i), done=completedRace(i);
    card.disabled=!open; card.classList.toggle('rc-race-locked',!open); card.classList.toggle('rc-race-done',done);
    let badge=card.querySelector<HTMLElement>('.rc-progress-badge');
    if(!badge){badge=document.createElement('div');badge.className='rc-progress-badge';card.appendChild(badge);}
    badge.textContent=done?'✓ CONCLUÍDA':open?(i===0?'ETAPA 1 · LIBERADA':`ETAPA ${i+1} · LIBERADA`):`🔒 TERMINE A ETAPA ${i}`;
  });
  const title=panel.querySelector<HTMLElement>('.rc-cups-title'); if(title) title.textContent='3 ETAPAS · UMA COPA';
}
function cleanConfirmationCopy(): void { document.querySelector<HTMLElement>('.rc-summer-confirm:not(.hidden) .rc-confirm-info small')?.remove(); }
function install(): void {
  const style=document.createElement('style'); style.textContent=`
    .panel-chars .char-card.rc-car-locked{opacity:.42;filter:grayscale(.75);position:relative}.rc-lock-badge{position:absolute;left:6px;right:6px;bottom:8px;padding:5px 3px;border-radius:8px;background:rgba(5,8,18,.88);border:1px solid rgba(255,255,255,.22);font-size:10px;font-weight:900;text-align:center;color:#fff;z-index:5}.rc-summer-confirm.hidden{display:none!important;pointer-events:none!important}
    .rc-progress-badge{margin-top:8px;padding:6px;border-radius:9px;background:rgba(0,0,0,.32);font-size:10px;font-weight:1000;text-align:center;color:#ffe38a}.rc-race-locked{opacity:.38;filter:grayscale(.7)}.rc-race-done{border-color:#4ade80!important}.rc-race-done .rc-progress-badge{color:#86efac}
    @media (orientation:landscape){.rc-summer-track-list{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;overflow:visible!important;gap:10px!important}.rc-summer-track-card{min-width:0!important;width:100%!important;min-height:0!important}.rc-summer-cup{width:min(96vw,1100px)!important;max-height:92vh!important}.rc-track-map{height:min(22vh,115px)!important}.rc-race-detail{max-height:22vh;overflow:auto}}
    #rc-landscape-notice{display:none;position:fixed;inset:0;z-index:99999;background:#07101f;color:#fff;align-items:center;justify-content:center;text-align:center;padding:28px;font:900 20px system-ui} @media (orientation:portrait){#rc-landscape-notice{display:flex}.game-canvas,#ui,#rio-mobile-controls{visibility:hidden!important}}
  `; document.head.appendChild(style);
  const notice=document.createElement('div');notice.id='rc-landscape-notice';notice.innerHTML='📱↻<br><br>RC RUSH FOI FEITO PARA JOGAR NA HORIZONTAL<br><small style="font-size:13px;opacity:.75">Gire o celular para continuar</small>';document.body.appendChild(notice);
  document.addEventListener('click',(ev)=>{
    const target=ev.target as HTMLElement|null;
    const summerCard=target?.closest<HTMLButtonElement>('.rc-summer-track-card');
    if(summerCard){const cards=Array.from(document.querySelectorAll('.rc-summer-track-card'));const i=cards.indexOf(summerCard);if(i>=0&&!unlockedRace(i)){ev.preventDefault();ev.stopImmediatePropagation();return;}}
    const start=target?.closest<HTMLButtonElement>('.rc-confirm-start'); const back=target?.closest<HTMLButtonElement>('.rc-summer-confirm .rc-cups-back'); if(!start&&!back)return;
    ev.preventDefault();ev.stopImmediatePropagation(); const confirm=document.querySelector<HTMLElement>('.rc-summer-confirm');const panel=visibleTrackPanel();if(!confirm||!panel)return;
    if(back){hideConfirmation();panel.style.visibility='';const b=Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(x=>x.textContent?.includes('VOLTAR'));b?.click();setTimeout(unlockStarterCars,0);return;}
    hideConfirmation();panel.style.visibility='';startSelectedSummerRace(raceIndex());
  },true);
  const refresh=()=>{const racing=document.querySelector('#rio-mobile-controls.race-active');if(racing)hideConfirmation();else{cleanConfirmationCopy();unlockStarterCars();refreshSummerProgress();}};
  new MutationObserver(refresh).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
