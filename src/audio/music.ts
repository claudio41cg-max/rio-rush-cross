/** RC Rush lightweight procedural soundtrack. All tracks are generated in-game with Web Audio. */
import type { MusicTrack } from '../core/types';
import { midiToFreq } from './synth';

interface Song { bpm:number; chords:number[][]; bass:number[]; melody:number[]; gain:number; }

const MENU:Song={bpm:88,chords:[[57,61,64],[54,57,61],[50,54,57],[52,57,61]],bass:[38,35,31,33],melody:[69,73,76,73,66,69,73,69],gain:.34};
const RESULTS:Song={bpm:96,chords:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]],bass:[36,33,29,31],melody:[72,76,79,76,69,72,74,71],gain:.34};
const FINAL:Song={bpm:138,chords:[[55,59,62],[52,55,59],[48,52,55],[50,54,57]],bass:[43,40,36,38],melody:[79,83,81,76,77,81,79,74],gain:.43};

/** Five copyright-safe procedural songs selectable in Settings. */
const RACE_SONGS:Song[]=[
 {bpm:124,chords:[[55,59,62],[52,55,59],[48,52,55],[50,54,57]],bass:[43,40,36,38],melody:[74,79,76,71,72,76,74,69],gain:.46},
 {bpm:128,chords:[[57,60,64],[53,57,60],[50,53,57],[55,59,62]],bass:[45,41,38,43],melody:[76,79,81,79,72,76,79,74],gain:.44},
 {bpm:118,chords:[[52,55,59],[48,52,55],[50,54,57],[47,50,54]],bass:[40,36,38,35],melody:[71,74,79,76,69,72,76,74],gain:.45},
 {bpm:132,chords:[[59,62,66],[55,59,62],[52,55,59],[57,61,64]],bass:[47,43,40,45],melody:[78,83,81,74,76,81,78,73],gain:.43},
 {bpm:136,chords:[[54,57,61],[50,54,57],[47,50,54],[52,56,59]],bass:[42,38,35,40],melody:[73,78,80,76,71,75,78,68],gain:.44},
];

function raceSong():Song{
 const raw=Number(localStorage.getItem('rc-race-song')??'0');
 const i=Number.isFinite(raw)?Math.max(0,Math.min(RACE_SONGS.length-1,Math.floor(raw))):0;
 return RACE_SONGS[i];
}
function musicLevel():number{
 const raw=Number(localStorage.getItem('rc-music-volume')??'0.72');
 return Number.isFinite(raw)?Math.max(.05,Math.min(1,raw)):.72;
}

class SoftLoop{
 readonly output:GainNode;private timer:ReturnType<typeof setInterval>|null=null;private step=0;private stopped=false;private readonly beat:number;private readonly level:number;
 constructor(private ctx:AudioContext,private dest:AudioNode,private song:Song){this.output=ctx.createGain();this.output.gain.value=0;this.output.connect(dest);this.beat=60/song.bpm;this.level=musicLevel();}
 start(at:number,fade:number){const now=this.ctx.currentTime;this.output.gain.setValueAtTime(.0001,now);this.output.gain.exponentialRampToValueAtTime(this.level,Math.max(now+.02,at)+Math.max(.05,fade));this.timer=setInterval(()=>this.tick(),this.beat*500);this.tick();}
 private tone(note:number,when:number,dur:number,vol:number,type:OscillatorType='triangle'){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();o.type=type;o.frequency.value=midiToFreq(note);f.type='lowpass';f.frequency.value=type==='sine'?1300:2450;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(vol*this.song.gain,when+.025);g.gain.exponentialRampToValueAtTime(.0001,when+dur);o.connect(f);f.connect(g);g.connect(this.output);o.start(when);o.stop(when+dur+.03);o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();};}
 private tick(){if(this.stopped)return;const now=this.ctx.currentTime+.025,s=this.step++,bar=Math.floor(s/8)%4,pos=s%8;if(pos===0){for(const n of this.song.chords[bar])this.tone(n,now,this.beat*3.7,.14,'triangle');this.tone(this.song.bass[bar],now,this.beat*1.7,.22,'sine');}if(pos===4)this.tone(this.song.bass[bar]+7,now,this.beat*1.5,.14,'sine');if(pos%2===0)this.tone(this.song.melody[pos],now,this.beat*.72,.10,'triangle');}
 stop(fade:number){if(this.stopped)return;this.stopped=true;if(this.timer)clearInterval(this.timer);const now=this.ctx.currentTime;this.output.gain.cancelScheduledValues(now);this.output.gain.setValueAtTime(Math.max(.0001,this.output.gain.value),now);this.output.gain.exponentialRampToValueAtTime(.0001,now+Math.max(.05,fade));setTimeout(()=>this.output.disconnect(),fade*1000+500);}
 dispose(){this.stop(.02);}
}

/** Compatibility sequencer used by the star-power jingle in AudioEngine. */
export class Sequencer extends SoftLoop {}
export function buildStarJingle():Song{return{bpm:152,chords:[[60,64,67],[62,65,69],[64,67,71],[62,65,69]],bass:[48,50,52,50],melody:[84,88,91,88,86,89,93,89],gain:.28};}

export class MusicPlayer{
 private current:SoftLoop|null=null;private currentTrack:MusicTrack='none';
 constructor(private ctx:AudioContext,private dest:AudioNode){}
 get track():MusicTrack{return this.currentTrack;}
 play(track:MusicTrack){
  if(track===this.currentTrack)return;
  if(track==='none'){this.stop();return;}
  const song=track==='race'?raceSong():track==='finalLap'?FINAL:track==='results'?RESULTS:MENU;
  const next=new SoftLoop(this.ctx,this.dest,song);
  if(this.current)this.current.stop(.65);
  next.start(this.ctx.currentTime+.05,.55);
  this.current=next;this.currentTrack=track;
 }
 stop(){if(this.current)this.current.stop(.65);this.current=null;this.currentTrack='none';}
 dispose(){if(this.current)this.current.dispose();this.current=null;this.currentTrack='none';}
}
export function warmMusic(_ctx:AudioContext):void{}
