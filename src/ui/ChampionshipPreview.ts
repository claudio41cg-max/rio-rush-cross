import { el } from './dom';
import type { TrackDefinition } from '../core/types';
import { KART_COUNT } from '../core/constants';
import { summerBeach, summerSunset, summerTropical } from '../track/tracks';

const SUMMER_TRACKS: TrackDefinition[] = [summerBeach, summerSunset, summerTropical];
const RACE_SONGS = ['SUMMER DRIVE', 'BEACH RUNNERS', 'SUNSET RACE', 'TROPICAL VIBES', 'NIGHT SPEED'];
const POINTS = [15, 12, 10, 8, 6, 4, 2, 0];
const CUPS = [
  { icon: '☀️', name: 'COPA VERÃO', sub: '3 pistas costeiras', state: 'ABERTA', cls: 'summer' },
  { icon: '❄️', name: 'COPA INVERNO', sub: '3 pistas geladas', state: 'BLOQUEADA', cls: 'winter' },
  { icon: '🌙', name: 'COPA DA NOITE', sub: '3 pistas noturnas', state: 'BLOQUEADA', cls: 'night' },
  { icon: '🏜️', name: 'COPA DO DESERTO', sub: '3 pistas quentes', state: 'BLOQUEADA', cls: 'desert' },
  { icon: '🌲', name: 'COPA FLORESTA', sub: '3 pistas verdes', state: 'BLOQUEADA', cls: 'forest' },
];

function stop(ev: Event): void { ev.preventDefault(); ev.stopPropagation(); }
function isSummerMode(): boolean { return sessionStorage.getItem('rc-championship') === 'summer'; }
function selectedRace(): number {
  const n = Number(sessionStorage.getItem('rc-summer-race') ?? '-1');
  return Number.isFinite(n) && n >= 0 && n < SUMMER_TRACKS.length ? Math.floor(n) : -1;
}
function selectRace(i: number): void { sessionStorage.setItem('rc-summer-race', String(i)); }
function setSummerMode(on: boolean, clearRace = false): void {
  document.body.classList.toggle('rc-summer-active', on);
  if (on) sessionStorage.setItem('rc-championship', 'summer');
  else sessionStorage.removeItem('rc-championship');
  if (clearRace) sessionStorage.removeItem('rc-summer-race');
}
function pointsFor(place: number): number { return POINTS[Math.max(0, Math.min(POINTS.length - 1, place - 1))] ?? 0; }
function totalCupPoints(): number {
  return SUMMER_TRACKS.reduce((sum, _, i) => sum + Number(localStorage.getItem(`rc-summer-points-${i}`) ?? '0'), 0);
}
function distanceApprox(t: TrackDefinition): number {
  let d = 0; const p = t.controlPoints;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; d += Math.hypot(b.x-a.x, b.z-a.z); }
  return d;
}
function formatEstimate(t: TrackDefinition): string {
  const seconds = Math.round((distanceApprox(t) * t.laps) / 17);
  return `~${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2,'0')}s`;
}
function mapSvg(t: TrackDefinition): string {
  const pts=t.controlPoints; const xs=pts.map(p=>p.x), zs=pts.map(p=>p.z);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minZ=Math.min(...zs), maxZ=Math.max(...zs);
  const w=Math.max(1,maxX-minX), h=Math.max(1,maxZ-minZ), pad=10;
  const mapped=pts.map(p=>({x:pad+(p.x-minX)/w*(220-pad*2),y:pad+(p.z-minZ)/h*(110-pad*2)}));
  const d=mapped.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')+' Z';
  return `<svg viewBox="0 0 220 110" aria-label="Mapa da pista"><path class="rc-map-shadow" d="${d}"/><path class="rc-map-line" d="${d}"/><circle cx="${mapped[0].x}" cy="${mapped[0].y}" r="4" class="rc-map-start"/></svg>`;
}
function trackCards(): HTMLElement[] { return Array.from(document.querySelectorAll<HTMLElement>('.panel-tracks .track-card')); }
function findTrackCard(index: number): HTMLElement | null {
  const wanted=SUMMER_TRACKS[index]?.name.toUpperCase();
  return trackCards().find(c => c.querySelector<HTMLElement>('.card-name')?.textContent?.trim().toUpperCase()===wanted) ?? null;
}
function clearTrackFilter(): void {
  trackCards().forEach(c=>c.style.display='');
  const title=document.querySelector<HTMLElement>('.panel-tracks .panel-title'); if(title) title.textContent='ESCOLHA UM CIRCUITO';
}
function selectedCarName(): string {
  return document.querySelector<HTMLElement>('.panel-chars .char-card.selected .card-name')?.textContent?.trim() || 'SEU RC';
}

function createSettingsPanel(title: HTMLElement): HTMLElement {
  const panel=el('div','rc-settings hidden',undefined,title); el('div','rc-cups-kicker','CONFIGURAÇÕES',panel); el('div','rc-cups-title','ÁUDIO DA CORRIDA',panel);
  const row=el('div','rc-setting-row',undefined,panel); el('label','','🎵 VOLUME DA MÚSICA',row);
  const volume=document.createElement('input'); volume.type='range'; volume.min='0'; volume.max='100'; volume.step='5'; volume.value=String(Math.round(Number(localStorage.getItem('rc-music-volume') ?? '.72')*100));
  const value=el('b','',`${volume.value}%`,row); row.appendChild(volume);
  volume.addEventListener('input',()=>{value.textContent=`${volume.value}%`;localStorage.setItem('rc-music-volume',String(Number(volume.value)/100));});
  el('div','rc-setting-label','ESCOLHER MÚSICA DA CORRIDA',panel); const list=el('div','rc-music-list',undefined,panel);
  let selected=Math.max(0,Math.min(4,Number(localStorage.getItem('rc-race-song')??'0'))); const buttons:HTMLButtonElement[]=[];
  RACE_SONGS.forEach((name,i)=>{const b=el('button','rc-music-choice',`${i+1}. ${name}`,list) as HTMLButtonElement;b.type='button';b.classList.toggle('selected',i===selected);b.addEventListener('click',ev=>{stop(ev);selected=i;localStorage.setItem('rc-race-song',String(i));buttons.forEach((x,k)=>x.classList.toggle('selected',k===i));});buttons.push(b);});
  el('div','rc-settings-note','A música escolhida entra na próxima corrida. O motor continua tocando junto.',panel); const back=el('button','rc-cups-back','← VOLTAR',panel) as HTMLButtonElement;back.type='button'; return panel;
}

export function installChampionshipPreview(): void {
  const tryInstall=():boolean=>{
    const title=document.querySelector<HTMLElement>('.panel-title-screen'); if(!title||title.querySelector('.rc-mode-menu')) return !!title;
    const ui=document.querySelector<HTMLElement>('#ui') ?? document.body;
    const modeMenu=el('div','rc-mode-menu',undefined,title); el('div','rc-mode-title','ESCOLHA O MODO',modeMenu);
    const modeRow=el('div','rc-mode-buttons',undefined,modeMenu);
    const champ=el('button','rc-mode-btn rc-mode-primary','🏆 CAMPEONATO',modeRow) as HTMLButtonElement;
    const free=el('button','rc-mode-btn','🏁 CORRIDA LIVRE',modeRow) as HTMLButtonElement;
    const garage=el('button','rc-mode-btn','🔧 GARAGEM',modeRow) as HTMLButtonElement;
    const settings=el('button','rc-mode-btn','⚙ CONFIGURAÇÕES',modeRow) as HTMLButtonElement;
    [champ,free,garage,settings].forEach(b=>b.type='button');

    const cups=el('div','rc-cups hidden',undefined,title); el('div','rc-cups-kicker','MODO CAMPEONATO',cups); el('div','rc-cups-title','ESCOLHA SUA COPA',cups); const cupGrid=el('div','rc-cup-grid',undefined,cups);
    const summerPanel=el('div','rc-summer-cup hidden',undefined,title); el('div','rc-cups-kicker','COPA VERÃO',summerPanel); el('div','rc-cups-title','ESCOLHA UMA CORRIDA',summerPanel);
    const total=el('div','rc-cup-total',`PONTOS DA COPA: ${totalCupPoints()}`,summerPanel);
    const summerList=el('div','rc-summer-track-list',undefined,summerPanel); const detail=el('div','rc-race-detail','Escolha uma corrida para ver todos os detalhes.',summerPanel);
    const summerCards:HTMLButtonElement[]=[];
    const startChoice=el('button','rc-mode-btn rc-mode-primary rc-summer-start disabled','ESCOLHA UMA CORRIDA',summerPanel) as HTMLButtonElement; startChoice.type='button'; startChoice.disabled=true;
    SUMMER_TRACKS.forEach((t,i)=>{
      const card=el('button','rc-summer-track-card',undefined,summerList) as HTMLButtonElement;card.type='button';card.innerHTML=`<div class="rc-track-map">${mapSvg(t)}</div><div class="rc-track-card-copy"><b>${i+1}. ${t.name.toUpperCase()}</b><span>${'★'.repeat(t.difficulty)}${'☆'.repeat(3-t.difficulty)} · ${t.laps} voltas</span><small>1º ${POINTS[0]} pts · 2º ${POINTS[1]} · 3º ${POINTS[2]}</small></div>`;
      card.addEventListener('click',ev=>{stop(ev);selectRace(i);summerCards.forEach((c,k)=>c.classList.toggle('selected',k===i));const km=(distanceApprox(t)*t.laps/1000).toFixed(1);detail.innerHTML=`<strong>${t.name}</strong><span>${t.description}</span><div class="rc-race-specs"><b>🏁 ${t.laps} VOLTAS</b><b>🚗 ${KART_COUNT} CARROS</b><b>📏 ${km} KM aprox.</b><b>⏱ ${formatEstimate(t)} estimado</b></div><div class="rc-points-line">PONTOS: 1º 15 · 2º 12 · 3º 10 · 4º 8 · 5º 6 · 6º 4 · 7º 2 · 8º 0</div>`;startChoice.disabled=false;startChoice.classList.remove('disabled');startChoice.textContent='ESCOLHER CARRO →';});summerCards.push(card);
    });
    const summerBack=el('button','rc-cups-back','← VOLTAR',summerPanel) as HTMLButtonElement;summerBack.type='button';

    for(const cup of CUPS){const card=el('button',`rc-cup-card ${cup.cls}`,undefined,cupGrid) as HTMLButtonElement;card.type='button';el('div','rc-cup-icon',cup.icon,card);const copy=el('div','rc-cup-copy',undefined,card);el('strong','',cup.name,copy);el('span','',cup.sub,copy);el('small',cup.state==='ABERTA'?'open':'',cup.state,copy);card.addEventListener('click',ev=>{stop(ev);if(cup.state!=='ABERTA')return;cups.classList.add('hidden');summerPanel.classList.remove('hidden');total.textContent=`PONTOS DA COPA: ${totalCupPoints()}`;});}
    const cupBack=el('button','rc-cups-back','← VOLTAR',cups) as HTMLButtonElement;cupBack.type='button';
    const settingsPanel=createSettingsPanel(title), settingsBack=settingsPanel.querySelector<HTMLButtonElement>('.rc-cups-back');

    const confirm=el('div','rc-summer-confirm hidden',undefined,ui); el('div','rc-cups-kicker','COPA VERÃO',confirm); const confirmTitle=el('div','rc-cups-title','PRONTO PARA CORRER?',confirm); const confirmInfo=el('div','rc-confirm-info','',confirm); const confirmActions=el('div','rc-summer-actions',undefined,confirm); const confirmBack=el('button','rc-cups-back','← TROCAR CARRO',confirmActions) as HTMLButtonElement; const confirmStart=el('button','rc-mode-btn rc-mode-primary rc-confirm-start','COMEÇAR COPA VERÃO',confirmActions) as HTMLButtonElement;
    confirmBack.type='button';confirmStart.type='button'; let hiddenTrackPanel:HTMLElement|null=null;
    const hideConfirm=()=>{confirm.classList.add('hidden');if(hiddenTrackPanel)hiddenTrackPanel.style.visibility='';hiddenTrackPanel=null;};
    const showConfirm=()=>{if(!isSummerMode()||selectedRace()<0)return;const panel=document.querySelector<HTMLElement>('.panel-tracks.active');if(!panel||!confirm.classList.contains('hidden'))return;const idx=selectedRace(), track=SUMMER_TRACKS[idx], target=findTrackCard(idx);if(target)target.click();hiddenTrackPanel=panel;panel.style.visibility='hidden';confirmTitle.textContent=`CORRIDA ${idx+1}/3 · ${track.name.toUpperCase()}`;confirmInfo.innerHTML=`<b>🚙 ${selectedCarName()}</b><span>${track.laps} voltas · ${KART_COUNT} carros · 1º lugar vale ${POINTS[0]} pontos</span><small>Você está no Campeonato. Nenhuma pista fora da Copa Verão será mostrada.</small>`;confirm.classList.remove('hidden');};
    confirmStart.addEventListener('click',ev=>{stop(ev);const panel=hiddenTrackPanel;const idx=selectedRace();if(!panel||idx<0)return;const target=findTrackCard(idx);const start=Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent?.includes('INICIAR CORRIDA'));if(target)target.click();hideConfirm();start?.click();});
    confirmBack.addEventListener('click',ev=>{stop(ev);hideConfirm();const panel=document.querySelector<HTMLElement>('.panel-tracks.active');const back=Array.from(panel?.querySelectorAll<HTMLButtonElement>('button')??[]).find(b=>b.textContent?.includes('VOLTAR'));back?.click();});

    champ.addEventListener('click',ev=>{stop(ev);modeMenu.classList.add('hidden');cups.classList.remove('hidden');});
    free.addEventListener('click',ev=>{stop(ev);setSummerMode(false,true);clearTrackFilter();title.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));});
    garage.addEventListener('click',ev=>{stop(ev);const old=garage.textContent;garage.textContent='EM BREVE';setTimeout(()=>garage.textContent=old,900);});
    settings.addEventListener('click',ev=>{stop(ev);modeMenu.classList.add('hidden');settingsPanel.classList.remove('hidden');});settingsBack?.addEventListener('click',ev=>{stop(ev);settingsPanel.classList.add('hidden');modeMenu.classList.remove('hidden');});
    cupBack.addEventListener('click',ev=>{stop(ev);cups.classList.add('hidden');modeMenu.classList.remove('hidden');});summerBack.addEventListener('click',ev=>{stop(ev);summerPanel.classList.add('hidden');cups.classList.remove('hidden');});
    startChoice.addEventListener('click',ev=>{stop(ev);if(selectedRace()<0)return;setSummerMode(true);summerPanel.classList.add('hidden');title.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));});

    document.addEventListener('click',ev=>{if(!isSummerMode())return;const btn=(ev.target as HTMLElement|null)?.closest<HTMLButtonElement>('.results .actions button');if(!btn)return;const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.results .actions button')),i=buttons.indexOf(btn);if(i===1){ev.preventDefault();ev.stopImmediatePropagation();sessionStorage.setItem('rc-open-summer-cup','1');setSummerMode(false,false);setTimeout(()=>buttons[2]?.click(),0);}else if(i===2){setSummerMode(false,true);}},true);

    const adaptResults=()=>{if(!isSummerMode())return;const results=document.querySelector<HTMLElement>('.results:not(.hidden)');if(!results)return;const buttons=Array.from(results.querySelectorAll<HTMLButtonElement>('.actions button'));if(buttons.length<3)return;buttons[0].textContent='JOGAR NOVAMENTE';buttons[1].style.display='';buttons[1].textContent='VOLTAR À COPA VERÃO';buttons[2].textContent='MENU PRINCIPAL';const idx=selectedRace();const kicker=results.querySelector<HTMLElement>('.panel-kicker');if(kicker)kicker.textContent=`COPA VERÃO · CORRIDA ${idx+1}/3`;if(results.dataset.rcPoints==='1')return;const row=results.querySelector<HTMLElement>('.standing-row.you'),placeText=row?.querySelector<HTMLElement>('.standing-place')?.textContent??'';const place=parseInt(placeText,10);if(Number.isFinite(place)){const pts=pointsFor(place);const old=Number(localStorage.getItem(`rc-summer-points-${idx}`)??'0');if(pts>old)localStorage.setItem(`rc-summer-points-${idx}`,String(pts));const sub=results.querySelector<HTMLElement>('.results-sub');if(sub){const score=el('div','rc-earned-points',`🏆 ${pts} PONTOS NESTA CORRIDA`,sub.parentElement??results);sub.insertAdjacentElement('afterend',score);}}results.dataset.rcPoints='1';};

    const observer=new MutationObserver(()=>{
      adaptResults();
      if(isSummerMode()&&document.querySelector('.panel-tracks.active'))showConfirm();
      if(sessionStorage.getItem('rc-open-summer-cup')==='1'&&document.querySelector('.panel-title-screen.active')){sessionStorage.removeItem('rc-open-summer-cup');modeMenu.classList.add('hidden');cups.classList.add('hidden');summerPanel.classList.remove('hidden');total.textContent=`PONTOS DA COPA: ${totalCupPoints()}`;}
    });observer.observe(document.body,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
    title.querySelector<HTMLElement>('.press-start')?.style.setProperty('display','none'); title.querySelector<HTMLElement>('.controls-legend')?.style.setProperty('display','none'); return true;
  };
  if(tryInstall())return;const observer=new MutationObserver(()=>{if(tryInstall())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});
}
